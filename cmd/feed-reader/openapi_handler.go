package main

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"strconv"
	"time"

	"github.com/nakatanakatana/feed-reader/gen/openapi"
	"github.com/nakatanakatana/feed-reader/store"
)

type OpenAPIHandler struct {
	store         *store.Store
	uuidGenerator UUIDGenerator
	fetcher       FeedFetcher
	itemFetcher   ItemFetcher
	opmlImporter  *OPMLImporter
}

type OpenAPIHandlerOption func(*OpenAPIHandler)

func WithOpenAPIFetcher(fetcher FeedFetcher) OpenAPIHandlerOption {
	return func(h *OpenAPIHandler) {
		h.fetcher = fetcher
	}
}

func WithOpenAPIItemFetcher(itemFetcher ItemFetcher) OpenAPIHandlerOption {
	return func(h *OpenAPIHandler) {
		h.itemFetcher = itemFetcher
	}
}

func WithOpenAPIOPMLImporter(opmlImporter *OPMLImporter) OpenAPIHandlerOption {
	return func(h *OpenAPIHandler) {
		h.opmlImporter = opmlImporter
	}
}

func NewOpenAPIHandler(s *store.Store, options ...OpenAPIHandlerOption) *OpenAPIHandler {
	handler := &OpenAPIHandler{store: s, uuidGenerator: realUUIDGenerator{}}
	for _, option := range options {
		option(handler)
	}
	return handler
}

func (h *OpenAPIHandler) FeedsList(ctx context.Context, request openapi.FeedsListRequestObject) (openapi.FeedsListResponseObject, error) {
	var tagID any
	if request.Params.TagId != nil {
		tagID = *request.Params.TagId
	}
	feedRows, err := h.store.ListFeeds(ctx, store.ListFeedsParams{TagID: tagID})
	if err != nil {
		return openapi.FeedsList500JSONResponse{Code: "internal", Message: err.Error()}, nil
	}

	feeds := make([]openapi.Feed, 0, len(feedRows))
	for _, feed := range feedRows {
		converted, err := h.fullFeedToOpenAPI(ctx, feed)
		if err != nil {
			return openapi.FeedsList500JSONResponse{Code: "internal", Message: err.Error()}, nil
		}
		feeds = append(feeds, converted)
	}

	return openapi.FeedsList200JSONResponse(openapi.ListFeedsResponse{Feeds: feeds}), nil
}

func (h *OpenAPIHandler) FeedsCreate(ctx context.Context, request openapi.FeedsCreateRequestObject) (openapi.FeedsCreateResponseObject, error) {
	if request.Body == nil {
		return openapi.FeedsCreate500JSONResponse{Code: "invalid_argument", Message: "request body is required"}, nil
	}
	if request.Body.Url == "" {
		return openapi.FeedsCreate500JSONResponse{Code: "invalid_argument", Message: "url is required"}, nil
	}
	if h.fetcher == nil {
		return openapi.FeedsCreate500JSONResponse{Code: "internal", Message: "feed fetcher is not configured"}, nil
	}

	feed, err := h.createFeedFromURL(ctx, request.Body.Url, nil, request.Body.TagIds)
	if err != nil {
		return openapi.FeedsCreate500JSONResponse{Code: "internal", Message: err.Error()}, nil
	}
	converted, err := h.fullFeedToOpenAPI(ctx, *feed)
	if err != nil {
		return openapi.FeedsCreate500JSONResponse{Code: "internal", Message: err.Error()}, nil
	}

	return openapi.FeedsCreate200JSONResponse(openapi.CreateFeedResponse{
		Feed: converted,
	}), nil
}

func (h *OpenAPIHandler) FeedsRefresh(ctx context.Context, request openapi.FeedsRefreshRequestObject) (openapi.FeedsRefreshResponseObject, error) {
	if request.Body == nil {
		return openapi.FeedsRefresh500JSONResponse{Code: "invalid_argument", Message: "request body is required"}, nil
	}
	if len(request.Body.Ids) > 0 && h.itemFetcher == nil {
		return openapi.FeedsRefresh500JSONResponse{Code: "internal", Message: "item fetcher is not configured"}, nil
	}

	if len(request.Body.Ids) == 0 {
		return openapi.FeedsRefresh200JSONResponse(openapi.RefreshFeedsResponse{}), nil
	}

	fetchResults, err := h.itemFetcher.FetchFeedsByIDsSync(ctx, request.Body.Ids)
	if err != nil {
		return openapi.FeedsRefresh500JSONResponse{Code: "internal", Message: err.Error()}, nil
	}

	results := make([]openapi.FeedFetchStatus, 0, len(fetchResults))
	for _, result := range fetchResults {
		var errorMessage *string
		if result.ErrorMessage != "" {
			errorMessage = &result.ErrorMessage
		}
		results = append(results, openapi.FeedFetchStatus{
			FeedId:        result.FeedID,
			Success:       result.Success,
			NewItemsCount: result.NewItemsCount,
			ErrorMessage:  errorMessage,
		})
	}

	return openapi.FeedsRefresh200JSONResponse(openapi.RefreshFeedsResponse{Results: results}), nil
}

func (h *OpenAPIHandler) FeedsExportOpml(ctx context.Context, request openapi.FeedsExportOpmlRequestObject) (openapi.FeedsExportOpmlResponseObject, error) {
	if request.Body == nil {
		return openapi.FeedsExportOpml500JSONResponse{Code: "invalid_argument", Message: "request body is required"}, nil
	}

	opmlContent, err := h.exportOPML(ctx, request.Body.Ids)
	if err != nil {
		return openapi.FeedsExportOpml500JSONResponse{Code: "internal", Message: err.Error()}, nil
	}

	return openapi.FeedsExportOpml200JSONResponse(openapi.ExportOpmlResponse{
		OpmlContent: opmlContent,
	}), nil
}

func (h *OpenAPIHandler) FeedsImportOpml(ctx context.Context, request openapi.FeedsImportOpmlRequestObject) (openapi.FeedsImportOpmlResponseObject, error) {
	if request.Body == nil {
		return openapi.FeedsImportOpml500JSONResponse{Code: "invalid_argument", Message: "request body is required"}, nil
	}
	if h.opmlImporter == nil {
		return openapi.FeedsImportOpml500JSONResponse{Code: "internal", Message: "OPML importer is not configured"}, nil
	}

	results, err := h.opmlImporter.ImportSync(ctx, request.Body.OpmlContent)
	if err != nil {
		return openapi.FeedsImportOpml500JSONResponse{Code: "internal", Message: err.Error()}, nil
	}

	failedFeeds := make([]openapi.ImportFailedFeed, 0, len(results.FailedFeeds))
	for _, failedFeed := range results.FailedFeeds {
		failedFeeds = append(failedFeeds, openapi.ImportFailedFeed{
			Url:          failedFeed.URL,
			ErrorMessage: failedFeed.ErrorMessage,
		})
	}

	return openapi.FeedsImportOpml200JSONResponse(openapi.ImportOpmlResponse{
		Total:       results.Total,
		Success:     results.Success,
		Skipped:     results.Skipped,
		FailedFeeds: failedFeeds,
	}), nil
}

func (h *OpenAPIHandler) FeedsSuspend(ctx context.Context, request openapi.FeedsSuspendRequestObject) (openapi.FeedsSuspendResponseObject, error) {
	if request.Body == nil {
		return openapi.FeedsSuspend500JSONResponse{Code: "invalid_argument", Message: "request body is required"}, nil
	}
	suspendSeconds, err := strconv.ParseInt(request.Body.SuspendSeconds, 10, 64)
	if err != nil {
		return openapi.FeedsSuspend500JSONResponse{Code: "invalid_argument", Message: "suspendSeconds must be a decimal int64 string"}, nil
	}

	if len(request.Body.Ids) > 0 {
		nextFetch := time.Now().UTC().Add(time.Duration(suspendSeconds) * time.Second).Format(time.RFC3339)
		for _, id := range request.Body.Ids {
			if err := h.store.MarkFeedFetched(ctx, store.MarkFeedFetchedParams{FeedID: id, NextFetch: &nextFetch}); err != nil {
				return openapi.FeedsSuspend500JSONResponse{Code: "internal", Message: err.Error()}, nil
			}
		}
	}

	return openapi.FeedsSuspend200Response{}, nil
}

func (h *OpenAPIHandler) FeedsDelete(ctx context.Context, request openapi.FeedsDeleteRequestObject) (openapi.FeedsDeleteResponseObject, error) {
	if err := h.store.DeleteFeed(ctx, request.Id); err != nil {
		return openapi.FeedsDelete500JSONResponse{Code: "internal", Message: err.Error()}, nil
	}

	return openapi.FeedsDelete200Response{}, nil
}

func (h *OpenAPIHandler) FeedTagsList(ctx context.Context, request openapi.FeedTagsListRequestObject) (openapi.FeedTagsListResponseObject, error) {
	params := store.ListFeedTagsParams{}
	if request.Params.FeedId != nil {
		params.FeedID = *request.Params.FeedId
	}
	if request.Params.TagId != nil {
		params.TagID = *request.Params.TagId
	}
	rows, err := h.store.ListFeedTags(ctx, params)
	if err != nil {
		return openapi.FeedTagsList500JSONResponse{Code: "internal", Message: err.Error()}, nil
	}

	feedTags := make([]openapi.FeedTag, 0, len(rows))
	for _, feedTag := range rows {
		feedTags = append(feedTags, openapi.FeedTag{
			FeedId: feedTag.FeedID,
			TagId:  feedTag.TagID,
		})
	}

	return openapi.FeedTagsList200JSONResponse(openapi.ListFeedTagsResponse{FeedTags: feedTags}), nil
}

func (h *OpenAPIHandler) FeedTagsManage(ctx context.Context, request openapi.FeedTagsManageRequestObject) (openapi.FeedTagsManageResponseObject, error) {
	if request.Body == nil {
		return openapi.FeedTagsManage500JSONResponse{Code: "invalid_argument", Message: "request body is required"}, nil
	}
	if err := h.store.ManageFeedTags(ctx, request.Body.FeedIds, request.Body.AddTagIds, request.Body.RemoveTagIds); err != nil {
		return openapi.FeedTagsManage500JSONResponse{Code: "internal", Message: err.Error()}, nil
	}

	return openapi.FeedTagsManage200Response{}, nil
}

func (h *OpenAPIHandler) ItemsList(ctx context.Context, request openapi.ItemsListRequestObject) (openapi.ItemsListResponseObject, error) {
	pageSize := int64(100)
	if request.Params.PageSize != nil {
		if *request.Params.PageSize <= 0 || *request.Params.PageSize > 1000 {
			return openapi.ItemsList500JSONResponse{Code: "invalid_argument", Message: fmt.Sprintf("page_size must be between 1 and 1000, got %d", *request.Params.PageSize)}, nil
		}
		pageSize = int64(*request.Params.PageSize)
	}
	var feedID any
	if request.Params.FeedId != nil {
		feedID = *request.Params.FeedId
	}
	var isRead any
	if request.Params.IsRead != nil {
		if *request.Params.IsRead {
			isRead = int64(1)
		} else {
			isRead = int64(0)
		}
	}
	var tagID any
	if request.Params.TagId != nil {
		tagID = *request.Params.TagId
	}
	var since any
	if request.Params.Since != nil {
		since = request.Params.Since.UTC().Format(time.RFC3339)
	}

	params := store.StoreListItemsParams{
		FeedID:    feedID,
		IsRead:    isRead,
		TagID:     tagID,
		Since:     since,
		Limit:     pageSize + 1,
		IsBlocked: false,
	}

	if pageToken := valueOrEmpty(request.Params.PageToken); pageToken != "" {
		b, err := base64.RawURLEncoding.DecodeString(pageToken)
		if err != nil {
			return openapi.ItemsList500JSONResponse{Code: "invalid_argument", Message: fmt.Sprintf("invalid page_token: %v", err)}, nil
		}
		var token openAPIListItemsPageToken
		if err := json.Unmarshal(b, &token); err != nil {
			return openapi.ItemsList500JSONResponse{Code: "invalid_argument", Message: fmt.Sprintf("invalid page_token: %v", err)}, nil
		}
		if token.CreatedAt == "" || token.ID == "" {
			return openapi.ItemsList500JSONResponse{Code: "invalid_argument", Message: "invalid page_token: both created_at and id must be provided for pagination"}, nil
		}
		createdAt, err := time.Parse(time.RFC3339, token.CreatedAt)
		if err != nil {
			return openapi.ItemsList500JSONResponse{Code: "invalid_argument", Message: fmt.Sprintf("invalid page_token: created_at must be RFC3339: %v", err)}, nil
		}
		params.CreatedAtCursor = createdAt.UTC().Format(time.RFC3339)
		params.IDCursor = token.ID
	}

	rows, err := h.store.ListItems(ctx, params)
	if err != nil {
		return openapi.ItemsList500JSONResponse{Code: "internal", Message: err.Error()}, nil
	}

	hasNextPage := false
	if len(rows) > int(pageSize) {
		hasNextPage = true
		rows = rows[:pageSize]
	}

	items := make([]openapi.Item, 0, len(rows))
	for _, row := range rows {
		item, err := listItemsRowToOpenAPI(row)
		if err != nil {
			return openapi.ItemsList500JSONResponse{Code: "internal", Message: err.Error()}, nil
		}
		items = append(items, item)
	}

	var nextPageToken string
	if hasNextPage && len(rows) > 0 {
		lastRow := rows[len(rows)-1]
		token := openAPIListItemsPageToken{CreatedAt: lastRow.CreatedAt, ID: lastRow.ID}
		b, err := json.Marshal(token)
		if err != nil {
			slog.Error("failed to marshal list items page token", "error", err)
		} else {
			nextPageToken = base64.RawURLEncoding.EncodeToString(b)
		}
	}

	return openapi.ItemsList200JSONResponse(openapi.ListItemsResponse{
		Items:         items,
		NextPageToken: nextPageToken,
	}), nil
}

func (h *OpenAPIHandler) ItemsUpdateStatus(ctx context.Context, request openapi.ItemsUpdateStatusRequestObject) (openapi.ItemsUpdateStatusResponseObject, error) {
	if request.Body == nil {
		return openapi.ItemsUpdateStatus500JSONResponse{Code: "invalid_argument", Message: "request body is required"}, nil
	}

	if err := h.updateItemStatus(ctx, request.Body.Ids, request.Body.IsRead); err != nil {
		return openapi.ItemsUpdateStatus500JSONResponse{Code: "internal", Message: err.Error()}, nil
	}

	return openapi.ItemsUpdateStatus200Response{}, nil
}

func (h *OpenAPIHandler) ItemsGet(ctx context.Context, request openapi.ItemsGetRequestObject) (openapi.ItemsGetResponseObject, error) {
	row, err := h.store.GetItem(ctx, request.Id)
	if err != nil {
		return openapi.ItemsGet500JSONResponse{Code: "internal", Message: err.Error()}, nil
	}

	item, err := getItemRowToOpenAPI(row)
	if err != nil {
		return openapi.ItemsGet500JSONResponse{Code: "internal", Message: err.Error()}, nil
	}
	return openapi.ItemsGet200JSONResponse(openapi.GetItemResponse{Item: &item}), nil
}

func (h *OpenAPIHandler) ItemReadsList(ctx context.Context, request openapi.ItemReadsListRequestObject) (openapi.ItemReadsListResponseObject, error) {
	limit := int64(100)
	if request.Params.PageSize != nil {
		if *request.Params.PageSize <= 0 || *request.Params.PageSize > 1000 {
			return openapi.ItemReadsList500JSONResponse{Code: "invalid_argument", Message: fmt.Sprintf("page_size must be between 1 and 1000, got %d", *request.Params.PageSize)}, nil
		}
		limit = int64(*request.Params.PageSize)
	}
	pageToken := valueOrEmpty(request.Params.PageToken)
	if pageToken != "" && request.Params.Since != nil {
		return openapi.ItemReadsList500JSONResponse{Code: "invalid_argument", Message: "only one of page_token or since may be specified"}, nil
	}

	params := store.ListItemReadParams{Limit: limit + 1}
	if pageToken != "" {
		b, err := base64.RawURLEncoding.DecodeString(pageToken)
		if err != nil {
			return openapi.ItemReadsList500JSONResponse{Code: "invalid_argument", Message: fmt.Sprintf("invalid page_token: %v", err)}, nil
		}
		var token openAPIListItemReadPageToken
		if err := json.Unmarshal(b, &token); err != nil {
			return openapi.ItemReadsList500JSONResponse{Code: "invalid_argument", Message: fmt.Sprintf("invalid page_token: %v", err)}, nil
		}
		if token.UpdatedAt == "" || token.ItemID == "" {
			return openapi.ItemReadsList500JSONResponse{Code: "invalid_argument", Message: "invalid page_token: both updated_at and item_id must be provided for pagination"}, nil
		}
		updatedAt, err := time.Parse(time.RFC3339, token.UpdatedAt)
		if err != nil {
			return openapi.ItemReadsList500JSONResponse{Code: "invalid_argument", Message: fmt.Sprintf("invalid page_token: invalid updated_at: %v", err)}, nil
		}
		params.UpdatedAtCursor = updatedAt.UTC().Format(time.RFC3339)
		params.ItemIDCursor = &token.ItemID
	}
	if request.Params.Since != nil {
		params.UpdatedAfter = request.Params.Since.UTC().Format(time.RFC3339)
	}

	rows, err := h.store.ListItemRead(ctx, params)
	if err != nil {
		return openapi.ItemReadsList500JSONResponse{Code: "internal", Message: err.Error()}, nil
	}

	hasNextPage := false
	if len(rows) > int(limit) {
		hasNextPage = true
		rows = rows[:limit]
	}

	itemReads := make([]openapi.ItemRead, 0, len(rows))
	for _, itemRead := range rows {
		updatedAt, err := parseOpenAPITime(itemRead.UpdatedAt)
		if err != nil {
			return openapi.ItemReadsList500JSONResponse{Code: "internal", Message: err.Error()}, nil
		}
		itemReads = append(itemReads, openapi.ItemRead{
			ItemId:    itemRead.ItemID,
			IsRead:    itemRead.IsRead == 1,
			UpdatedAt: updatedAt,
		})
	}

	var nextPageToken string
	if hasNextPage && len(rows) > 0 {
		lastRow := rows[len(rows)-1]
		token := openAPIListItemReadPageToken{UpdatedAt: lastRow.UpdatedAt, ItemID: lastRow.ItemID}
		b, err := json.Marshal(token)
		if err != nil {
			slog.Error("failed to marshal item reads page token", "error", err)
		} else {
			nextPageToken = base64.RawURLEncoding.EncodeToString(b)
		}
	}

	return openapi.ItemReadsList200JSONResponse(openapi.ListItemReadResponse{
		ItemReads:     itemReads,
		NextPageToken: nextPageToken,
	}), nil
}

func (h *OpenAPIHandler) URLRulesList(ctx context.Context, request openapi.URLRulesListRequestObject) (openapi.URLRulesListResponseObject, error) {
	ruleRows, err := h.store.ListURLParsingRules(ctx)
	if err != nil {
		return openapi.URLRulesList500JSONResponse{Code: "internal", Message: err.Error()}, nil
	}

	rules := make([]openapi.URLParsingRule, 0, len(ruleRows))
	for _, rule := range ruleRows {
		rules = append(rules, urlParsingRuleToOpenAPI(rule))
	}

	return openapi.URLRulesList200JSONResponse(openapi.ListURLParsingRulesResponse{Rules: rules}), nil
}

func (h *OpenAPIHandler) URLRulesAdd(ctx context.Context, request openapi.URLRulesAddRequestObject) (openapi.URLRulesAddResponseObject, error) {
	if request.Body == nil {
		return openapi.URLRulesAdd500JSONResponse{Code: "invalid_argument", Message: "request body is required"}, nil
	}

	rule, err := h.addURLParsingRule(ctx, request.Body.Domain, request.Body.RuleType, request.Body.Pattern)
	if err != nil {
		return openapi.URLRulesAdd500JSONResponse{Code: "internal", Message: err.Error()}, nil
	}

	return openapi.URLRulesAdd200JSONResponse(openapi.AddURLParsingRuleResponse{
		Rule: urlParsingRuleToOpenAPI(rule),
	}), nil
}

func (h *OpenAPIHandler) URLRulesDelete(ctx context.Context, request openapi.URLRulesDeleteRequestObject) (openapi.URLRulesDeleteResponseObject, error) {
	if err := h.store.DeleteURLParsingRule(ctx, request.Id); err != nil {
		return openapi.URLRulesDelete500JSONResponse{Code: "internal", Message: err.Error()}, nil
	}

	return openapi.URLRulesDelete200Response{}, nil
}

func (h *OpenAPIHandler) BlockRulesList(ctx context.Context, request openapi.BlockRulesListRequestObject) (openapi.BlockRulesListResponseObject, error) {
	ruleRows, err := h.store.ListItemBlockRules(ctx)
	if err != nil {
		return openapi.BlockRulesList500JSONResponse{Code: "internal", Message: err.Error()}, nil
	}

	rules := make([]openapi.ItemBlockRule, 0, len(ruleRows))
	for _, rule := range ruleRows {
		rules = append(rules, itemBlockRuleToOpenAPI(rule))
	}

	return openapi.BlockRulesList200JSONResponse(openapi.ListItemBlockRulesResponse{Rules: rules}), nil
}

func (h *OpenAPIHandler) BlockRulesAdd(ctx context.Context, request openapi.BlockRulesAddRequestObject) (openapi.BlockRulesAddResponseObject, error) {
	if request.Body == nil {
		return openapi.BlockRulesAdd500JSONResponse{Code: "invalid_argument", Message: "request body is required"}, nil
	}

	if err := h.addItemBlockRules(ctx, request.Body.Rules); err != nil {
		return openapi.BlockRulesAdd500JSONResponse{Code: "internal", Message: err.Error()}, nil
	}

	return openapi.BlockRulesAdd200Response{}, nil
}

func (h *OpenAPIHandler) BlockRulesDelete(ctx context.Context, request openapi.BlockRulesDeleteRequestObject) (openapi.BlockRulesDeleteResponseObject, error) {
	if err := h.store.DeleteItemBlockRule(ctx, request.Id); err != nil {
		return openapi.BlockRulesDelete500JSONResponse{Code: "internal", Message: err.Error()}, nil
	}

	return openapi.BlockRulesDelete200Response{}, nil
}

func (h *OpenAPIHandler) TagsCreate(ctx context.Context, request openapi.TagsCreateRequestObject) (openapi.TagsCreateResponseObject, error) {
	if request.Body == nil {
		return openapi.TagsCreate500JSONResponse{Code: "invalid_argument", Message: "request body is required"}, nil
	}

	tag, err := h.createTag(ctx, request.Body.Name)
	if err != nil {
		return openapi.TagsCreate500JSONResponse{Code: "internal", Message: err.Error()}, nil
	}

	return openapi.TagsCreate200JSONResponse(openapi.CreateTagResponse{
		Tag: tag,
	}), nil
}

func (h *OpenAPIHandler) TagsList(ctx context.Context, request openapi.TagsListRequestObject) (openapi.TagsListResponseObject, error) {
	tags, err := h.store.ListTags(ctx, store.ListTagsParams{})
	if err != nil {
		return openapi.TagsList500JSONResponse{Code: "internal", Message: err.Error()}, nil
	}

	totalUnread, err := h.store.CountTotalUnreadItems(ctx)
	if err != nil {
		return openapi.TagsList500JSONResponse{Code: "internal", Message: err.Error()}, nil
	}

	response := openapi.ListTagsResponse{
		Tags:             make([]openapi.Tag, 0, len(tags)),
		TotalUnreadCount: strconv.FormatInt(totalUnread, 10),
	}
	for _, tag := range tags {
		createdAt, err := parseOpenAPITime(tag.CreatedAt)
		if err != nil {
			return openapi.TagsList500JSONResponse{Code: "internal", Message: err.Error()}, nil
		}
		updatedAt, err := parseOpenAPITime(tag.UpdatedAt)
		if err != nil {
			return openapi.TagsList500JSONResponse{Code: "internal", Message: err.Error()}, nil
		}

		response.Tags = append(response.Tags, openapi.Tag{
			Id:          tag.ID,
			Name:        tag.Name,
			CreatedAt:   createdAt,
			UpdatedAt:   updatedAt,
			UnreadCount: strconv.FormatInt(tag.UnreadCount, 10),
			FeedCount:   strconv.FormatInt(tag.FeedCount, 10),
		})
	}

	return openapi.TagsList200JSONResponse(response), nil
}

func (h *OpenAPIHandler) TagsDelete(ctx context.Context, request openapi.TagsDeleteRequestObject) (openapi.TagsDeleteResponseObject, error) {
	if err := h.store.DeleteTag(ctx, request.Id); err != nil {
		return openapi.TagsDelete500JSONResponse{Code: "internal", Message: err.Error()}, nil
	}

	return openapi.TagsDelete200Response{}, nil
}

func parseOpenAPITime(value string) (time.Time, error) {
	parsed, err := time.Parse(time.RFC3339, value)
	if err != nil {
		return time.Time{}, fmt.Errorf("failed to parse RFC3339 time %q: %w", value, err)
	}
	return parsed, nil
}

type openAPIListItemsPageToken struct {
	CreatedAt string `json:"created_at"`
	ID        string `json:"id"`
}

type openAPIListItemReadPageToken struct {
	UpdatedAt string `json:"updated_at"`
	ItemID    string `json:"item_id"`
}

func (h *OpenAPIHandler) createFeedFromURL(ctx context.Context, feedURL string, titleOverride *string, tagIDs []string) (*store.FullFeed, error) {
	fetchedFeed, err := h.fetcher.Fetch(ctx, "", feedURL)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch feed: %w", err)
	}
	newUUID, err := h.uuidGenerator.NewRandom()
	if err != nil {
		return nil, fmt.Errorf("failed to generate UUID: %w", err)
	}
	strPtr := func(value string) *string {
		if value == "" {
			return nil
		}
		return &value
	}
	var imageURL *string
	if fetchedFeed.Image != nil {
		imageURL = strPtr(fetchedFeed.Image.URL)
	}
	title := fetchedFeed.Title
	if titleOverride != nil && *titleOverride != "" {
		title = *titleOverride
	}
	feed, err := h.store.CreateFeed(ctx, store.CreateFeedParams{
		ID:          newUUID.String(),
		Url:         feedURL,
		Title:       strPtr(title),
		Description: strPtr(fetchedFeed.Description),
		Link:        strPtr(fetchedFeed.Link),
		Lang:        strPtr(fetchedFeed.Language),
		ImageUrl:    imageURL,
		Copyright:   strPtr(fetchedFeed.Copyright),
		FeedType:    strPtr(fetchedFeed.FeedType),
		FeedVersion: strPtr(fetchedFeed.FeedVersion),
	})
	if err != nil {
		return nil, err
	}
	now := time.Now().UTC().Format(time.RFC3339)
	if err := h.store.MarkFeedFetched(ctx, store.MarkFeedFetchedParams{FeedID: feed.ID, NextFetch: &now}); err != nil {
		return nil, err
	}
	if len(tagIDs) > 0 {
		if err := h.store.SetFeedTags(ctx, feed.ID, tagIDs); err != nil {
			return nil, err
		}
	}
	feedWithSchedule, err := h.store.GetFeed(ctx, feed.ID)
	if err != nil {
		return nil, err
	}
	return &feedWithSchedule, nil
}

func (h *OpenAPIHandler) exportOPML(ctx context.Context, ids []string) ([]byte, error) {
	if len(ids) == 0 {
		return nil, errors.New("ids must not be empty")
	}
	feeds, err := h.store.ListFeedsByIDs(ctx, ids)
	if err != nil {
		return nil, err
	}
	tagRows, err := h.store.ListTagsByFeedIDs(ctx, ids)
	if err != nil {
		return nil, err
	}
	tagsByFeed := make(map[string][]string)
	for _, row := range tagRows {
		tagsByFeed[row.FeedID] = append(tagsByFeed[row.FeedID], row.Name)
	}
	exportFeeds := make([]ExportFeed, len(feeds))
	for i, feed := range feeds {
		title := feed.Url
		if feed.Title != nil && *feed.Title != "" {
			title = *feed.Title
		}
		link := ""
		if feed.Link != nil {
			link = *feed.Link
		}
		feedType := "rss"
		if feed.FeedType != nil {
			feedType = *feed.FeedType
		}
		tagNames := tagsByFeed[feed.ID]
		if tagNames == nil {
			tagNames = []string{}
		}
		exportFeeds[i] = ExportFeed{Title: title, XmlURL: feed.Url, HtmlURL: link, Tags: tagNames, Type: feedType}
	}
	return ExportOPML(exportFeeds)
}

func (h *OpenAPIHandler) fullFeedToOpenAPI(ctx context.Context, feed store.FullFeed) (openapi.Feed, error) {
	tags, err := h.store.ListTagsByFeedId(ctx, feed.ID)
	if err != nil {
		return openapi.Feed{}, err
	}
	openAPITags := make([]openapi.Tag, len(tags))
	for i, tag := range tags {
		openAPITags[i], err = storeTagToOpenAPI(tag)
		if err != nil {
			return openapi.Feed{}, err
		}
	}
	unreadCount, err := h.store.CountUnreadItemsByFeedID(ctx, feed.ID)
	if err != nil {
		return openapi.Feed{}, err
	}
	title := ""
	if feed.Title != nil {
		title = *feed.Title
	}
	createdAt, err := parseOpenAPITime(feed.CreatedAt)
	if err != nil {
		return openapi.Feed{}, err
	}
	updatedAt, err := parseOpenAPITime(feed.UpdatedAt)
	if err != nil {
		return openapi.Feed{}, err
	}
	lastFetchedAt, err := parseOptionalOpenAPITime(feed.LastFetchedAt)
	if err != nil {
		return openapi.Feed{}, err
	}
	nextFetchAt, err := parseOptionalOpenAPITime(feed.NextFetch)
	if err != nil {
		return openapi.Feed{}, err
	}
	return openapi.Feed{
		Id:            feed.ID,
		Url:           feed.Url,
		Link:          feed.Link,
		Title:         title,
		LastFetchedAt: lastFetchedAt,
		NextFetchAt:   nextFetchAt,
		CreatedAt:     createdAt,
		UpdatedAt:     updatedAt,
		Tags:          openAPITags,
		UnreadCount:   strconv.FormatInt(unreadCount, 10),
	}, nil
}

func storeTagToOpenAPI(tag store.Tag) (openapi.Tag, error) {
	return tagWithCountToOpenAPI(store.TagWithCount{
		ID:        tag.ID,
		Name:      tag.Name,
		CreatedAt: tag.CreatedAt,
		UpdatedAt: tag.UpdatedAt,
	})
}

func tagWithCountToOpenAPI(tag store.TagWithCount) (openapi.Tag, error) {
	createdAt, err := parseOpenAPITime(tag.CreatedAt)
	if err != nil {
		return openapi.Tag{}, err
	}
	updatedAt, err := parseOpenAPITime(tag.UpdatedAt)
	if err != nil {
		return openapi.Tag{}, err
	}
	return openapi.Tag{
		Id:          tag.ID,
		Name:        tag.Name,
		CreatedAt:   createdAt,
		UpdatedAt:   updatedAt,
		UnreadCount: strconv.FormatInt(tag.UnreadCount, 10),
		FeedCount:   strconv.FormatInt(tag.FeedCount, 10),
	}, nil
}

func (h *OpenAPIHandler) createTag(ctx context.Context, name string) (openapi.Tag, error) {
	newUUID, err := h.uuidGenerator.NewRandom()
	if err != nil {
		return openapi.Tag{}, fmt.Errorf("failed to generate UUID: %w", err)
	}
	tag, err := h.store.CreateTag(ctx, store.CreateTagParams{ID: newUUID.String(), Name: name})
	if err != nil {
		return openapi.Tag{}, err
	}
	return tagWithCountToOpenAPI(store.TagWithCount{
		ID:        tag.ID,
		Name:      tag.Name,
		CreatedAt: tag.CreatedAt,
		UpdatedAt: tag.UpdatedAt,
	})
}

func getItemRowToOpenAPI(item store.GetItemRow) (openapi.Item, error) {
	publishedAt, err := parseOptionalOpenAPITime(item.PublishedAt)
	if err != nil {
		return openapi.Item{}, err
	}
	createdAt, err := parseOpenAPITime(item.CreatedAt)
	if err != nil {
		return openapi.Item{}, err
	}
	return openapi.Item{
		Id:          item.ID,
		Url:         item.Url,
		Title:       stringValue(item.Title),
		Description: stringValue(item.Description),
		PublishedAt: timeValue(publishedAt),
		FeedId:      item.FeedID,
		IsRead:      item.IsRead == 1,
		Author:      stringValue(item.Author),
		Content:     stringValue(item.Content),
		ImageUrl:    stringValue(item.ImageUrl),
		Categories:  stringValue(item.Categories),
		CreatedAt:   createdAt,
	}, nil
}

func listItemsRowToOpenAPI(row store.ListItemsRow) (openapi.Item, error) {
	return getItemRowToOpenAPI(store.GetItemRow{
		ID:          row.ID,
		Url:         row.Url,
		Title:       row.Title,
		Description: &row.Description,
		PublishedAt: row.PublishedAt,
		Author:      row.Author,
		Guid:        row.Guid,
		Content:     row.Content,
		ImageUrl:    row.ImageUrl,
		Categories:  row.Categories,
		CreatedAt:   row.CreatedAt,
		FeedID:      row.FeedID,
		IsRead:      row.IsRead,
	})
}

func (h *OpenAPIHandler) updateItemStatus(ctx context.Context, ids []string, isRead *bool) error {
	return h.store.WithTransaction(ctx, func(qtx *store.Queries) error {
		now := time.Now().Format(time.RFC3339)
		for _, id := range ids {
			if isRead == nil {
				continue
			}
			readValue := int64(0)
			if *isRead {
				readValue = 1
			}
			if _, err := qtx.SetItemRead(ctx, store.SetItemReadParams{ItemID: id, IsRead: readValue, ReadAt: &now}); err != nil {
				return err
			}
		}
		return nil
	})
}

func (h *OpenAPIHandler) addURLParsingRule(ctx context.Context, domain string, ruleType string, pattern string) (store.UrlParsingRule, error) {
	if ruleType != "subdomain" && ruleType != "path" {
		return store.UrlParsingRule{}, fmt.Errorf("invalid rule_type: %s. Must be 'subdomain' or 'path'", ruleType)
	}
	if domain == "" {
		return store.UrlParsingRule{}, errors.New("domain is required")
	}
	if pattern == "" {
		return store.UrlParsingRule{}, errors.New("pattern is required")
	}
	newUUID, err := h.uuidGenerator.NewRandom()
	if err != nil {
		return store.UrlParsingRule{}, fmt.Errorf("failed to generate UUID: %w", err)
	}
	return h.store.CreateURLParsingRule(ctx, store.CreateURLParsingRuleParams{
		ID:       newUUID.String(),
		Domain:   domain,
		RuleType: ruleType,
		Pattern:  pattern,
	})
}

func urlParsingRuleToOpenAPI(rule store.UrlParsingRule) openapi.URLParsingRule {
	return openapi.URLParsingRule{
		Id:       rule.ID,
		Domain:   rule.Domain,
		RuleType: rule.RuleType,
		Pattern:  rule.Pattern,
	}
}

func (h *OpenAPIHandler) addItemBlockRules(ctx context.Context, rules []openapi.AddItemBlockRuleInput) error {
	params := make([]store.CreateItemBlockRuleParams, len(rules))
	for i, rule := range rules {
		if rule.Value == "" {
			return fmt.Errorf("value is required for rule at index %d", i)
		}
		switch rule.RuleType {
		case "user", "domain", "keyword":
		case "user_domain":
			if rule.Domain == nil || *rule.Domain == "" {
				return fmt.Errorf("domain is required for user_domain rule at index %d", i)
			}
		default:
			return fmt.Errorf("invalid rule_type at index %d: %s. Must be 'user', 'domain', 'user_domain', or 'keyword'", i, rule.RuleType)
		}
		newUUID, err := h.uuidGenerator.NewRandom()
		if err != nil {
			return fmt.Errorf("failed to generate UUID: %w", err)
		}
		domain := ""
		if rule.Domain != nil && *rule.Domain != "" {
			domain = *rule.Domain
		} else if rule.RuleType == "domain" {
			domain = rule.Value
		}
		params[i] = store.CreateItemBlockRuleParams{
			ID:        newUUID.String(),
			RuleType:  rule.RuleType,
			RuleValue: rule.Value,
			Domain:    domain,
		}
	}
	createdRules, err := h.store.CreateItemBlockRules(ctx, params)
	if err != nil {
		return err
	}
	go h.populateItemBlocksForRules(createdRules)
	return nil
}

func (h *OpenAPIHandler) populateItemBlocksForRules(rules []store.ItemBlockRule) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Minute)
	defer cancel()
	urlRules, err := h.store.ListURLParsingRules(ctx)
	if err != nil {
		slog.Error("Background block scan failed to list URL rules", "error", err)
		return
	}
	parser := NewURLParser(urlRules)
	items, err := h.store.ListItemsForBlocking(ctx)
	if err != nil {
		slog.Error("Background block scan failed to list items", "error", err)
		return
	}
	extractedInfoMap := make(map[string]store.ExtractedUserInfo)
	for _, item := range items {
		if info := parser.ExtractUserInfo(item.Url); info != nil {
			extractedInfoMap[item.Url] = *info
		}
	}
	for _, rule := range rules {
		if err := h.store.PopulateItemBlocksForRule(ctx, rule, items, extractedInfoMap); err != nil {
			slog.Error("Background block scan failed for rule", "rule_id", rule.ID, "error", err)
		}
	}
}

func itemBlockRuleToOpenAPI(rule store.ItemBlockRule) openapi.ItemBlockRule {
	var domain *string
	if rule.Domain != "" {
		domain = &rule.Domain
	}
	return openapi.ItemBlockRule{
		Id:       rule.ID,
		RuleType: rule.RuleType,
		Value:    rule.RuleValue,
		Domain:   domain,
	}
}

func parseOptionalOpenAPITime(value *string) (*time.Time, error) {
	if value == nil {
		return nil, nil
	}
	parsed, err := parseOpenAPITime(*value)
	if err != nil {
		return nil, err
	}
	return &parsed, nil
}

func timeValue(value *time.Time) time.Time {
	if value == nil {
		return time.Time{}
	}
	return *value
}

func stringValue(value *string) string {
	if value == nil {
		return ""
	}
	return *value
}

func valueOrEmpty(value *string) string {
	if value == nil {
		return ""
	}
	return *value
}
