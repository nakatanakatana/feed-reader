package main

import (
	"context"
	"database/sql"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"time"

	"connectrpc.com/connect"
	"github.com/nakatanakatana/feed-reader/gen/go/item/v1"
	"github.com/nakatanakatana/feed-reader/gen/go/item/v1/itemv1connect"
	"github.com/nakatanakatana/feed-reader/store"
)

type ItemServer struct {
	store         *store.Store
	uuidGenerator UUIDGenerator
}

func NewItemServer(s *store.Store, uuidGen UUIDGenerator) itemv1connect.ItemServiceHandler {
	if uuidGen == nil {
		uuidGen = realUUIDGenerator{}
	}
	return &ItemServer{
		store:         s,
		uuidGenerator: uuidGen,
	}
}

func (s *ItemServer) GetItem(ctx context.Context, req *connect.Request[itemv1.GetItemRequest]) (*connect.Response[itemv1.GetItemResponse], error) {
	item, err := s.store.GetItem(ctx, req.Msg.Id)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, connect.NewError(connect.CodeNotFound, err)
		}
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	return connect.NewResponse(&itemv1.GetItemResponse{
		Item: toProtoItem(item),
	}), nil
}

type listItemsPageToken struct {
	CreatedAt string `json:"created_at"`
	ID        string `json:"id"`
}

func (s *ItemServer) ListItems(ctx context.Context, req *connect.Request[itemv1.ListItemsRequest]) (*connect.Response[itemv1.ListItemsResponse], error) {
	pageSize := int64(req.Msg.PageSize)
	if pageSize <= 0 {
		pageSize = 100
	} else if pageSize > 1000 {
		pageSize = 1000
	}

	var feedID any
	if req.Msg.FeedId != nil {
		feedID = *req.Msg.FeedId
	}
	var isRead any
	if req.Msg.IsRead != nil {
		if *req.Msg.IsRead {
			isRead = int64(1)
		} else {
			isRead = int64(0)
		}
	}
	var tagID any
	if req.Msg.TagId != nil {
		tagID = *req.Msg.TagId
	}
	var since any
	if req.Msg.Since != nil {
		since = req.Msg.Since.AsTime().UTC().Format(time.RFC3339)
	}

	params := store.StoreListItemsParams{
		FeedID:    feedID,
		IsRead:    isRead,
		TagID:     tagID,
		Since:     since,
		Limit:     pageSize + 1,
		IsBlocked: false,
	}

	if req.Msg.PageToken != "" {
		b, err := base64.StdEncoding.DecodeString(req.Msg.PageToken)
		if err != nil {
			return nil, connect.NewError(connect.CodeInvalidArgument, fmt.Errorf("invalid page_token: %w", err))
		}
		var token listItemsPageToken
		if err := json.Unmarshal(b, &token); err != nil {
			return nil, connect.NewError(connect.CodeInvalidArgument, fmt.Errorf("invalid page_token: %w", err))
		}
		if token.CreatedAt == "" || token.ID == "" {
			return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("invalid page_token: missing required fields"))
		}
		params.CreatedAtCursor = token.CreatedAt
		params.IDCursor = token.ID
	}

	rows, err := s.store.ListItems(ctx, params)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	hasNextPage := false
	if len(rows) > int(pageSize) {
		hasNextPage = true
		rows = rows[:pageSize]
	}

	protoItems := make([]*itemv1.Item, len(rows))
	for i, row := range rows {
		protoItems[i] = toProtoItem(GetItemRowFromListItemsRow(row))
	}

	var nextPageToken string
	if hasNextPage && len(rows) > 0 {
		lastRow := rows[len(rows)-1]
		token := listItemsPageToken{
			CreatedAt: lastRow.CreatedAt,
			ID:        lastRow.ID,
		}
		b, err := json.Marshal(token)
		if err != nil {
			slog.Error("failed to marshal listItemsPageToken", "error", err)
		} else {
			nextPageToken = base64.StdEncoding.EncodeToString(b)
		}
	}

	return connect.NewResponse(&itemv1.ListItemsResponse{
		Items:         protoItems,
		NextPageToken: nextPageToken,
	}), nil
}

func (s *ItemServer) UpdateItemStatus(ctx context.Context, req *connect.Request[itemv1.UpdateItemStatusRequest]) (*connect.Response[itemv1.UpdateItemStatusResponse], error) {
	err := s.store.WithTransaction(ctx, func(qtx *store.Queries) error {
		now := time.Now().Format(time.RFC3339)

		for _, id := range req.Msg.Ids {
			if req.Msg.IsRead != nil {
				isRead := int64(0)
				if *req.Msg.IsRead {
					isRead = 1
				}
				_, err := qtx.SetItemRead(ctx, store.SetItemReadParams{
					ItemID: id,
					IsRead: isRead,
					ReadAt: &now,
				})
				if err != nil {
					return err
				}
			}
		}
		return nil
	})

	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	return connect.NewResponse(&itemv1.UpdateItemStatusResponse{}), nil
}

func (s *ItemServer) ListItemFeeds(ctx context.Context, req *connect.Request[itemv1.ListItemFeedsRequest]) (*connect.Response[itemv1.ListItemFeedsResponse], error) {
	rows, err := s.store.ListItemFeeds(ctx, req.Msg.ItemId)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	protoFeeds := make([]*itemv1.ItemFeed, len(rows))
	for i, row := range rows {
		protoFeeds[i] = &itemv1.ItemFeed{
			FeedId:      row.FeedID,
			FeedTitle:   row.FeedTitle,
			PublishedAt: toOptionalTimestamp(row.PublishedAt),
			CreatedAt:   toTimestamp(row.CreatedAt),
		}
	}

	return connect.NewResponse(&itemv1.ListItemFeedsResponse{
		Feeds: protoFeeds,
	}), nil
}

func (s *ItemServer) AddURLParsingRule(ctx context.Context, req *connect.Request[itemv1.AddURLParsingRuleRequest]) (*connect.Response[itemv1.AddURLParsingRuleResponse], error) {
	if req.Msg.RuleType != "subdomain" && req.Msg.RuleType != "path" {
		return nil, connect.NewError(connect.CodeInvalidArgument, fmt.Errorf("invalid rule_type: %s. Must be 'subdomain' or 'path'", req.Msg.RuleType))
	}
	if req.Msg.Domain == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("domain is required"))
	}
	if req.Msg.Pattern == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("pattern is required"))
	}

	newUUID, err := s.uuidGenerator.NewRandom()
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, fmt.Errorf("failed to generate UUID: %w", err))
	}

	rule, err := s.store.CreateURLParsingRule(ctx, store.CreateURLParsingRuleParams{
		ID:       newUUID.String(),
		Domain:   req.Msg.Domain,
		RuleType: req.Msg.RuleType,
		Pattern:  req.Msg.Pattern,
	})
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	return connect.NewResponse(&itemv1.AddURLParsingRuleResponse{
		Rule: &itemv1.URLParsingRule{
			Id:       rule.ID,
			Domain:   rule.Domain,
			RuleType: rule.RuleType,
			Pattern:  rule.Pattern,
		},
	}), nil
}

func (s *ItemServer) DeleteURLParsingRule(ctx context.Context, req *connect.Request[itemv1.DeleteURLParsingRuleRequest]) (*connect.Response[itemv1.DeleteURLParsingRuleResponse], error) {
	if err := s.store.DeleteURLParsingRule(ctx, req.Msg.Id); err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}
	return connect.NewResponse(&itemv1.DeleteURLParsingRuleResponse{}), nil
}

func (s *ItemServer) ListURLParsingRules(ctx context.Context, req *connect.Request[itemv1.ListURLParsingRulesRequest]) (*connect.Response[itemv1.ListURLParsingRulesResponse], error) {
	rules, err := s.store.ListURLParsingRules(ctx)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	protoRules := make([]*itemv1.URLParsingRule, len(rules))
	for i, rule := range rules {
		protoRules[i] = &itemv1.URLParsingRule{
			Id:       rule.ID,
			Domain:   rule.Domain,
			RuleType: rule.RuleType,
			Pattern:  rule.Pattern,
		}
	}

	return connect.NewResponse(&itemv1.ListURLParsingRulesResponse{
		Rules: protoRules,
	}), nil
}

func (s *ItemServer) AddItemBlockRules(ctx context.Context, req *connect.Request[itemv1.AddItemBlockRulesRequest]) (*connect.Response[itemv1.AddItemBlockRulesResponse], error) {
	params := make([]store.CreateItemBlockRuleParams, len(req.Msg.Rules))
	for i, r := range req.Msg.Rules {
		if r.Value == "" {
			return nil, connect.NewError(connect.CodeInvalidArgument, fmt.Errorf("value is required for rule at index %d", i))
		}

		switch r.RuleType {
		case "user", "domain", "keyword":
			// valid
		case "user_domain":
			if r.Domain == nil || *r.Domain == "" {
				return nil, connect.NewError(connect.CodeInvalidArgument, fmt.Errorf("domain is required for user_domain rule at index %d", i))
			}
		default:
			return nil, connect.NewError(connect.CodeInvalidArgument, fmt.Errorf("invalid rule_type at index %d: %s. Must be 'user', 'domain', 'user_domain', or 'keyword'", i, r.RuleType))
		}

		newUUID, err := s.uuidGenerator.NewRandom()
		if err != nil {
			return nil, connect.NewError(connect.CodeInternal, fmt.Errorf("failed to generate UUID: %w", err))
		}

		domain := ""
		if r.Domain != nil && *r.Domain != "" {
			domain = *r.Domain
		} else if r.RuleType == "domain" {
			domain = r.Value
		}

		params[i] = store.CreateItemBlockRuleParams{
			ID:        newUUID.String(),
			RuleType:  r.RuleType,
			RuleValue: r.Value,
			Domain:    domain,
		}
	}

	rules, err := s.store.CreateItemBlockRules(ctx, params)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	// Trigger scanning of existing items for these new rules
	go func() {
		// Use a background context with timeout for the scanning process
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Minute)
		defer cancel()

		// 1. Fetch all URL parsing rules
		urlRules, err := s.store.ListURLParsingRules(ctx)
		if err != nil {
			slog.Error("Background block scan failed to list URL rules", "error", err)
			return
		}
		parser := NewURLParser(urlRules)

		// 2. Fetch all items
		items, err := s.store.ListItemsForBlocking(ctx)
		if err != nil {
			slog.Error("Background block scan failed to list items", "error", err)
			return
		}

		// 3. Pre-extract info for all items to avoid redundant parsing
		extractedInfoMap := make(map[string]store.ExtractedUserInfo)
		for _, item := range items {
			if info := parser.ExtractUserInfo(item.Url); info != nil {
				extractedInfoMap[item.Url] = *info
			}
		}

		// 4. For each new rule, populate blocks
		for _, rule := range rules {
			if err := s.store.PopulateItemBlocksForRule(ctx, rule, items, extractedInfoMap); err != nil {
				slog.Error("Background block scan failed for rule", "rule_id", rule.ID, "error", err)
			}
		}
	}()

	return connect.NewResponse(&itemv1.AddItemBlockRulesResponse{}), nil
}

func (s *ItemServer) DeleteItemBlockRule(ctx context.Context, req *connect.Request[itemv1.DeleteItemBlockRuleRequest]) (*connect.Response[itemv1.DeleteItemBlockRuleResponse], error) {
	if err := s.store.DeleteItemBlockRule(ctx, req.Msg.Id); err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}
	return connect.NewResponse(&itemv1.DeleteItemBlockRuleResponse{}), nil
}

func (s *ItemServer) ListItemBlockRules(ctx context.Context, req *connect.Request[itemv1.ListItemBlockRulesRequest]) (*connect.Response[itemv1.ListItemBlockRulesResponse], error) {
	rules, err := s.store.ListItemBlockRules(ctx)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	protoRules := make([]*itemv1.ItemBlockRule, len(rules))
	for i, rule := range rules {
		var domain *string
		if rule.Domain != "" {
			d := rule.Domain
			domain = &d
		}
		protoRules[i] = &itemv1.ItemBlockRule{
			Id:       rule.ID,
			RuleType: rule.RuleType,
			Value:    rule.RuleValue,
			Domain:   domain,
		}
	}

	return connect.NewResponse(&itemv1.ListItemBlockRulesResponse{
		Rules: protoRules,
	}), nil
}

type listItemReadPageToken struct {
	UpdatedAt string `json:"updated_at"`
	ItemID    string `json:"item_id"`
}

func (s *ItemServer) ListItemRead(ctx context.Context, req *connect.Request[itemv1.ListItemReadRequest]) (*connect.Response[itemv1.ListItemReadResponse], error) {
	limit := int64(req.Msg.PageSize)
	if limit <= 0 {
		limit = 100
	} else if limit > 1000 {
		limit = 1000
	}

	// Validate that both page_token and since are not provided at the same time.
	if req.Msg.PageToken != "" && req.Msg.Since != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("only one of page_token or since may be specified"))
	}

	params := store.ListItemReadParams{
		Limit: limit + 1,
	}

	if req.Msg.PageToken != "" {
		b, err := base64.StdEncoding.DecodeString(req.Msg.PageToken)
		if err != nil {
			return nil, connect.NewError(connect.CodeInvalidArgument, fmt.Errorf("invalid page_token: %w", err))
		}
		var token listItemReadPageToken
		if err := json.Unmarshal(b, &token); err != nil {
			return nil, connect.NewError(connect.CodeInvalidArgument, fmt.Errorf("invalid page_token: %w", err))
		}
		// Validate decoded page_token fields before using them.
		if token.UpdatedAt == "" || token.ItemID == "" {
			return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("invalid page_token: missing required fields"))
		}
		parsedUpdatedAt, err := time.Parse(time.RFC3339, token.UpdatedAt)
		if err != nil {
			return nil, connect.NewError(connect.CodeInvalidArgument, fmt.Errorf("invalid page_token: invalid updated_at: %w", err))
		}
		// Normalize to UTC RFC3339 string for deterministic DB comparison
		params.UpdatedAtCursor = parsedUpdatedAt.UTC().Format(time.RFC3339)
		params.ItemIDCursor = &token.ItemID
	} else if req.Msg.Since != nil {
		params.UpdatedAfter = req.Msg.Since.AsTime().UTC().Format(time.RFC3339)
	}

	rows, err := s.store.ListItemRead(ctx, params)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	pageSize := int(limit)
	hasNextPage := false
	if len(rows) > pageSize {
		hasNextPage = true
		rows = rows[:pageSize]
	}

	itemReads := make([]*itemv1.ItemRead, len(rows))
	for i, row := range rows {
		itemReads[i] = &itemv1.ItemRead{
			ItemId:    row.ItemID,
			IsRead:    row.IsRead == 1,
			UpdatedAt: toTimestamp(row.UpdatedAt),
		}
	}

	var nextPageToken string
	if hasNextPage && len(rows) > 0 {
		lastRow := rows[len(rows)-1]
		token := listItemReadPageToken{
			UpdatedAt: lastRow.UpdatedAt,
			ItemID:    lastRow.ItemID,
		}
		b, err := json.Marshal(token)
		if err != nil {
			slog.Error("failed to marshal listItemReadPageToken", "error", err)
		} else {
			nextPageToken = base64.StdEncoding.EncodeToString(b)
		}
	}

	return connect.NewResponse(&itemv1.ListItemReadResponse{
		ItemReads:     itemReads,
		NextPageToken: nextPageToken,
	}), nil
}

func GetItemRowFromListItemsRow(row store.ListItemsRow) store.GetItemRow {
	return store.GetItemRow{
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
	}
}

func toProtoItem(row store.GetItemRow) *itemv1.Item {
	var title string
	if row.Title != nil {
		title = *row.Title
	}
	var desc string
	if row.Description != nil {
		desc = *row.Description
	}
	var author string
	if row.Author != nil {
		author = *row.Author
	}
	var content string
	if row.Content != nil {
		content = *row.Content
	}
	var img string
	if row.ImageUrl != nil {
		img = *row.ImageUrl
	}
	var cats string
	if row.Categories != nil {
		cats = *row.Categories
	}

	return &itemv1.Item{
		Id:          row.ID,
		Url:         row.Url,
		Title:       title,
		Description: desc,
		PublishedAt: toOptionalTimestamp(row.PublishedAt),
		Author:      author,
		FeedId:      row.FeedID,
		IsRead:      row.IsRead == 1,
		Content:     content,
		ImageUrl:    img,
		Categories:  cats,
		CreatedAt:   toTimestamp(row.CreatedAt),
	}
}
