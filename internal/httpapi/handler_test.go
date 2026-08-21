package httpapi_test

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/nakatanakatana/feed-reader/gen/openapi"
	"github.com/nakatanakatana/feed-reader/internal/httpapi"
	"github.com/nakatanakatana/feed-reader/store"
	"gotest.tools/v3/assert"
)

func TestOpenAPIListTags(t *testing.T) {
	ctx := context.Background()
	s := setupTestDB(t)

	tag, err := s.CreateTag(ctx, store.CreateTagParams{ID: "tag-1", Name: "Tech"})
	assert.NilError(t, err)
	assert.Assert(t, tag.ID != "")

	handler := openapi.HandlerFromMuxWithBaseURL(
		openapi.NewStrictHandler(httpapi.NewStrictHandler(httpapi.Dependencies{Store: s}), nil),
		http.NewServeMux(),
		"/api/v2",
	)

	req := httptest.NewRequest(http.MethodGet, "/api/v2/tags", nil)
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	assert.Equal(t, rec.Code, http.StatusOK)

	var body openapi.ListTagsResponse
	err = json.Unmarshal(rec.Body.Bytes(), &body)
	assert.NilError(t, err)
	assert.Equal(t, len(body.Tags), 1)
	assert.Equal(t, body.Tags[0].Name, "Tech")
}

func TestOpenAPICreateAndDeleteTag(t *testing.T) {
	s := setupTestDB(t)
	handler := openapi.HandlerFromMuxWithBaseURL(
		openapi.NewStrictHandler(httpapi.NewStrictHandler(httpapi.Dependencies{Store: s}), nil),
		http.NewServeMux(),
		"/api/v2",
	)

	createReq := httptest.NewRequest(http.MethodPost, "/api/v2/tags", strings.NewReader(`{"name":"Tech"}`))
	createReq.Header.Set("Content-Type", "application/json")
	createRec := httptest.NewRecorder()
	handler.ServeHTTP(createRec, createReq)
	assert.Equal(t, createRec.Code, http.StatusOK, createRec.Body.String())

	var createBody openapi.CreateTagResponse
	err := json.Unmarshal(createRec.Body.Bytes(), &createBody)
	assert.NilError(t, err)
	assert.Equal(t, createBody.Tag.Name, "Tech")

	deleteReq := httptest.NewRequest(http.MethodDelete, "/api/v2/tags/"+createBody.Tag.Id, nil)
	deleteRec := httptest.NewRecorder()
	handler.ServeHTTP(deleteRec, deleteReq)
	assert.Equal(t, deleteRec.Code, http.StatusOK, deleteRec.Body.String())
}

func TestOpenAPIListAndManageFeedTags(t *testing.T) {
	ctx := context.Background()
	s := setupTestDB(t)
	_, err := s.CreateFeed(ctx, store.CreateFeedParams{ID: "feed-1", Url: "https://example.com/feed.xml"})
	assert.NilError(t, err)
	_, err = s.CreateTag(ctx, store.CreateTagParams{ID: "tag-1", Name: "Tech"})
	assert.NilError(t, err)
	handler := openapi.HandlerFromMuxWithBaseURL(
		openapi.NewStrictHandler(httpapi.NewStrictHandler(httpapi.Dependencies{Store: s}), nil),
		http.NewServeMux(),
		"/api/v2",
	)

	manageReq := httptest.NewRequest(http.MethodPost, "/api/v2/feed-tags/manage", strings.NewReader(`{"feedIds":["feed-1"],"addTagIds":["tag-1"],"removeTagIds":[]}`))
	manageReq.Header.Set("Content-Type", "application/json")
	manageRec := httptest.NewRecorder()
	handler.ServeHTTP(manageRec, manageReq)
	assert.Equal(t, manageRec.Code, http.StatusOK, manageRec.Body.String())

	listReq := httptest.NewRequest(http.MethodGet, "/api/v2/feed-tags", nil)
	listRec := httptest.NewRecorder()
	handler.ServeHTTP(listRec, listReq)
	assert.Equal(t, listRec.Code, http.StatusOK, listRec.Body.String())

	var listBody openapi.ListFeedTagsResponse
	err = json.Unmarshal(listRec.Body.Bytes(), &listBody)
	assert.NilError(t, err)
	assert.Equal(t, len(listBody.FeedTags), 1)
	assert.Equal(t, listBody.FeedTags[0].FeedId, "feed-1")
	assert.Equal(t, listBody.FeedTags[0].TagId, "tag-1")
}

func TestOpenAPIExportOpmlReturnsBytes(t *testing.T) {
	ctx := context.Background()
	s := setupTestDB(t)
	title := "Example Feed"
	_, err := s.CreateFeed(ctx, store.CreateFeedParams{ID: "feed-1", Url: "https://example.com/feed.xml", Title: &title})
	assert.NilError(t, err)
	handler := openapi.HandlerFromMuxWithBaseURL(
		openapi.NewStrictHandler(httpapi.NewStrictHandler(httpapi.Dependencies{Store: s}), nil),
		http.NewServeMux(),
		"/api/v2",
	)

	req := httptest.NewRequest(http.MethodPost, "/api/v2/feeds/export-opml", strings.NewReader(`{"ids":["feed-1"]}`))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	assert.Equal(t, rec.Code, http.StatusOK, rec.Body.String())

	var body openapi.ExportOpmlResponse
	err = json.Unmarshal(rec.Body.Bytes(), &body)
	assert.NilError(t, err)
	assert.Assert(t, strings.Contains(string(body.OpmlContent), `xmlUrl="https://example.com/feed.xml"`))
}

func TestOpenAPIListItemRead(t *testing.T) {
	ctx := context.Background()
	s := setupTestDB(t)
	_, err := s.CreateItem(ctx, store.CreateItemParams{ID: "item-1", Url: "https://example.com/item"})
	assert.NilError(t, err)
	_, err = s.SetItemRead(ctx, store.SetItemReadParams{ItemID: "item-1", IsRead: 1})
	assert.NilError(t, err)
	handler := openapi.HandlerFromMuxWithBaseURL(
		openapi.NewStrictHandler(httpapi.NewStrictHandler(httpapi.Dependencies{Store: s}), nil),
		http.NewServeMux(),
		"/api/v2",
	)

	req := httptest.NewRequest(http.MethodGet, "/api/v2/item-reads", nil)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	assert.Equal(t, rec.Code, http.StatusOK, rec.Body.String())

	var body openapi.ListItemReadResponse
	err = json.Unmarshal(rec.Body.Bytes(), &body)
	assert.NilError(t, err)
	assert.Equal(t, len(body.ItemReads), 1)
	assert.Equal(t, body.ItemReads[0].ItemId, "item-1")
	assert.Equal(t, body.ItemReads[0].IsRead, true)
}

func TestOpenAPICreateFeedRejectsEmptyURL(t *testing.T) {
	s := setupTestDB(t)

	handler := openapi.HandlerFromMuxWithBaseURL(
		openapi.NewStrictHandler(httpapi.NewStrictHandler(httpapi.Dependencies{Store: s}), nil),
		http.NewServeMux(),
		"/api/v2",
	)
	req := httptest.NewRequest(http.MethodPost, "/api/v2/feeds", strings.NewReader(`{"url":"","tagIds":[]}`))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	assert.Equal(t, rec.Code, http.StatusInternalServerError)

	var body openapi.ApiError
	err := json.Unmarshal(rec.Body.Bytes(), &body)
	assert.NilError(t, err)
	assert.Equal(t, body.Code, "invalid_argument")
	assert.Equal(t, body.Message, "url is required")
}

func TestOpenAPIUpdateItemStatusReturnsOK(t *testing.T) {
	ctx := context.Background()
	s := setupTestDB(t)

	_, err := s.CreateFeed(ctx, store.CreateFeedParams{ID: "feed-1", Url: "https://example.com/feed.xml"})
	assert.NilError(t, err)
	_, err = s.CreateItem(ctx, store.CreateItemParams{ID: "item-1", Url: "https://example.com/item"})
	assert.NilError(t, err)
	err = s.CreateFeedItem(ctx, store.CreateFeedItemParams{FeedID: "feed-1", ItemID: "item-1"})
	assert.NilError(t, err)
	_, err = s.SetItemRead(ctx, store.SetItemReadParams{ItemID: "item-1", IsRead: 0})
	assert.NilError(t, err)

	handler := openapi.HandlerFromMuxWithBaseURL(
		openapi.NewStrictHandler(httpapi.NewStrictHandler(httpapi.Dependencies{Store: s}), nil),
		http.NewServeMux(),
		"/api/v2",
	)
	req := httptest.NewRequest(http.MethodPost, "/api/v2/items/status", strings.NewReader(`{"ids":["item-1"],"isRead":true}`))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	assert.Equal(t, rec.Code, http.StatusOK)

	row, err := s.GetItem(ctx, "item-1")
	assert.NilError(t, err)
	assert.Equal(t, row.IsRead, int64(1))
}

func TestOpenAPIGetItemReturnsLinkedFeeds(t *testing.T) {
	ctx := context.Background()
	s := setupTestDB(t)

	firstTitle := "Primary Feed"
	secondTitle := "Backup Feed"
	_, err := s.CreateFeed(ctx, store.CreateFeedParams{ID: "feed-1", Url: "https://example.com/primary.xml", Title: &firstTitle})
	assert.NilError(t, err)
	_, err = s.CreateFeed(ctx, store.CreateFeedParams{ID: "feed-2", Url: "https://example.com/backup.xml", Title: &secondTitle})
	assert.NilError(t, err)
	itemTitle := "Shared Item"
	_, err = s.CreateItem(ctx, store.CreateItemParams{ID: "item-1", Url: "https://example.com/item", Title: &itemTitle})
	assert.NilError(t, err)
	err = s.CreateFeedItem(ctx, store.CreateFeedItemParams{FeedID: "feed-1", ItemID: "item-1"})
	assert.NilError(t, err)
	err = s.CreateFeedItem(ctx, store.CreateFeedItemParams{FeedID: "feed-2", ItemID: "item-1"})
	assert.NilError(t, err)

	handler := openapi.HandlerFromMuxWithBaseURL(
		openapi.NewStrictHandler(httpapi.NewStrictHandler(httpapi.Dependencies{Store: s}), nil),
		http.NewServeMux(),
		"/api/v2",
	)
	req := httptest.NewRequest(http.MethodGet, "/api/v2/items/item-1", nil)
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	assert.Equal(t, rec.Code, http.StatusOK, rec.Body.String())
	var body map[string]any
	err = json.Unmarshal(rec.Body.Bytes(), &body)
	assert.NilError(t, err)
	item := body["item"].(map[string]any)
	feeds, ok := item["feeds"].([]any)
	assert.Assert(t, ok, "expected item.feeds to be an array: %s", rec.Body.String())
	assert.Equal(t, len(feeds), 2)
	firstFeed := feeds[0].(map[string]any)
	secondFeed := feeds[1].(map[string]any)
	assert.Equal(t, firstFeed["id"], "feed-1")
	assert.Equal(t, firstFeed["title"], "Primary Feed")
	assert.Equal(t, secondFeed["id"], "feed-2")
	assert.Equal(t, secondFeed["title"], "Backup Feed")
}

func TestOpenAPIImportOpmlReturnsSummary(t *testing.T) {
	ctx := context.Background()
	s := setupTestDB(t)
	opmlImporter := &stubOPMLImporter{store: s}
	handler := openapi.HandlerFromMuxWithBaseURL(
		openapi.NewStrictHandler(httpapi.NewStrictHandler(httpapi.Dependencies{
			Store:        s,
			OPMLImporter: opmlImporter,
		}), nil),
		http.NewServeMux(),
		"/api/v2",
	)
	opmlContent := `<?xml version="1.0" encoding="UTF-8"?><opml version="1.0"><body><outline xmlUrl="https://example.com/feed.xml" /></body></opml>`
	body := `{"opmlContent":"` + base64.StdEncoding.EncodeToString([]byte(opmlContent)) + `"}`
	req := httptest.NewRequest(http.MethodPost, "/api/v2/feeds/import-opml", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	assert.Equal(t, rec.Code, http.StatusOK, rec.Body.String())

	var response openapi.ImportOpmlResponse
	err := json.Unmarshal(rec.Body.Bytes(), &response)
	assert.NilError(t, err)
	assert.Equal(t, response.Total, int32(1))
	assert.Equal(t, response.Success, int32(1))
	assert.Equal(t, response.Skipped, int32(0))
	assert.Equal(t, len(response.FailedFeeds), 0)

	feeds, err := s.ListFeeds(ctx, store.ListFeedsParams{})
	assert.NilError(t, err)
	assert.Equal(t, len(feeds), 1)
}

func TestOpenAPIURLParsingRules(t *testing.T) {
	ctx := context.Background()
	s := setupTestDB(t)

	_, err := s.CreateURLParsingRule(ctx, store.CreateURLParsingRuleParams{
		ID:       "url-rule-1",
		Domain:   "example.com",
		RuleType: "subdomain",
		Pattern:  "example.com",
	})
	assert.NilError(t, err)

	handler := openapi.HandlerFromMuxWithBaseURL(
		openapi.NewStrictHandler(httpapi.NewStrictHandler(httpapi.Dependencies{Store: s}), nil),
		http.NewServeMux(),
		"/api/v2",
	)

	req := httptest.NewRequest(http.MethodGet, "/api/v2/url-rules", nil)
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	assert.Equal(t, rec.Code, http.StatusOK)

	var body openapi.ListURLParsingRulesResponse
	err = json.Unmarshal(rec.Body.Bytes(), &body)
	assert.NilError(t, err)
	assert.Equal(t, len(body.Rules), 1)
	assert.Equal(t, body.Rules[0].Domain, "example.com")
	assert.Equal(t, body.Rules[0].RuleType, "subdomain")
	assert.Equal(t, body.Rules[0].Pattern, "example.com")
}

func TestOpenAPIAddAndDeleteItemBlockRules(t *testing.T) {
	s := setupTestDB(t)

	handler := openapi.HandlerFromMuxWithBaseURL(
		openapi.NewStrictHandler(httpapi.NewStrictHandler(httpapi.Dependencies{Store: s}), nil),
		http.NewServeMux(),
		"/api/v2",
	)

	addReq := httptest.NewRequest(http.MethodPost, "/api/v2/block-rules", strings.NewReader(`{"rules":[{"ruleType":"domain","value":"example.com"}]}`))
	addReq.Header.Set("Content-Type", "application/json")
	addRec := httptest.NewRecorder()

	handler.ServeHTTP(addRec, addReq)

	assert.Equal(t, addRec.Code, http.StatusOK)

	listReq := httptest.NewRequest(http.MethodGet, "/api/v2/block-rules", nil)
	listRec := httptest.NewRecorder()

	handler.ServeHTTP(listRec, listReq)

	assert.Equal(t, listRec.Code, http.StatusOK)

	var listBody openapi.ListItemBlockRulesResponse
	err := json.Unmarshal(listRec.Body.Bytes(), &listBody)
	assert.NilError(t, err)
	assert.Equal(t, len(listBody.Rules), 1)
	assert.Equal(t, listBody.Rules[0].RuleType, "domain")
	assert.Equal(t, listBody.Rules[0].Value, "example.com")
	assert.Assert(t, listBody.Rules[0].Domain != nil)
	assert.Equal(t, *listBody.Rules[0].Domain, "example.com")

	deleteReq := httptest.NewRequest(http.MethodDelete, "/api/v2/block-rules/"+listBody.Rules[0].Id, nil)
	deleteRec := httptest.NewRecorder()

	handler.ServeHTTP(deleteRec, deleteReq)

	assert.Equal(t, deleteRec.Code, http.StatusOK)
}

func TestOpenAPIGetItem_NullPublishedAt(t *testing.T) {
	ctx := context.Background()
	s := setupTestDB(t)

	_, err := s.CreateFeed(ctx, store.CreateFeedParams{
		ID:  "feed-1",
		Url: "https://example.com/feed.xml",
	})
	assert.NilError(t, err)

	_, err = s.CreateItem(ctx, store.CreateItemParams{
		ID:          "item-1",
		Url:         "https://example.com/item1.html",
		Title:       nil,
		Description: nil,
		PublishedAt: nil,
		Author:      nil,
		Guid:        nil,
		Content:     nil,
		ImageUrl:    nil,
		Categories:  nil,
	})
	assert.NilError(t, err)

	// feed_items also needs to be populated since ListItems or GetItem might join or require it
	err = s.CreateFeedItem(ctx, store.CreateFeedItemParams{
		FeedID:      "feed-1",
		ItemID:      "item-1",
		PublishedAt: nil,
	})
	assert.NilError(t, err)

	handler := openapi.HandlerFromMuxWithBaseURL(
		openapi.NewStrictHandler(httpapi.NewStrictHandler(httpapi.Dependencies{Store: s}), nil),
		http.NewServeMux(),
		"/api/v2",
	)

	req := httptest.NewRequest(http.MethodGet, "/api/v2/items/item-1", nil)
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	assert.Equal(t, rec.Code, http.StatusOK)

	bodyStr := rec.Body.String()
	assert.Assert(t, !strings.Contains(bodyStr, "0001-01-01"), "response body should not contain zero date 0001-01-01 but got: %s", bodyStr)
}

type stubOPMLImporter struct {
	store *store.Store
}

func (s *stubOPMLImporter) ImportSync(ctx context.Context, opmlContent []byte) (*httpapi.ImportResults, error) {
	_, err := s.store.CreateFeed(ctx, store.CreateFeedParams{
		ID:  "imported-feed-1",
		Url: "https://example.com/feed.xml",
	})
	if err != nil {
		return nil, err
	}
	return &httpapi.ImportResults{Total: 1, Success: 1, Skipped: 0, FailedFeeds: nil}, nil
}

func TestOpenAPIIgnoreWindowsList(t *testing.T) {
	ctx := context.Background()
	s := setupTestDB(t)

	handler := openapi.HandlerFromMuxWithBaseURL(
		openapi.NewStrictHandler(httpapi.NewStrictHandler(httpapi.Dependencies{Store: s}), nil),
		http.NewServeMux(),
		"/api/v2",
	)

	// 1. Empty list
	req := httptest.NewRequest(http.MethodGet, "/api/v2/ignore-windows", nil)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	assert.Equal(t, rec.Code, http.StatusOK, rec.Body.String())
	var emptyBody openapi.ListIgnoreWindowsResponse
	err := json.Unmarshal(rec.Body.Bytes(), &emptyBody)
	assert.NilError(t, err)
	assert.Equal(t, len(emptyBody.IgnoreWindows), 0)

	// 2. Populated list
	_, err = s.CreateIgnoreWindow(ctx, store.CreateIgnoreWindowParams{
		ID:         "win-1",
		Name:       "Night Shift",
		StartTime:  "23:00",
		EndTime:    "07:00",
		DaysOfWeek: "[1,2,3,4,5]",
		Timezone:   "Asia/Tokyo",
	})
	assert.NilError(t, err)

	_, err = s.CreateIgnoreWindow(ctx, store.CreateIgnoreWindowParams{
		ID:         "win-2",
		Name:       "Day Shift",
		StartTime:  "09:00",
		EndTime:    "17:00",
		DaysOfWeek: "[0,6]",
		Timezone:   "UTC",
	})
	assert.NilError(t, err)

	req = httptest.NewRequest(http.MethodGet, "/api/v2/ignore-windows", nil)
	rec = httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	assert.Equal(t, rec.Code, http.StatusOK, rec.Body.String())
	var popBody openapi.ListIgnoreWindowsResponse
	err = json.Unmarshal(rec.Body.Bytes(), &popBody)
	assert.NilError(t, err)
	assert.Equal(t, len(popBody.IgnoreWindows), 2)
	// Ordered by name ASC ("Day Shift", "Night Shift")
	assert.Equal(t, popBody.IgnoreWindows[0].Name, "Day Shift")
	assert.Equal(t, popBody.IgnoreWindows[0].StartTime, "09:00")
	assert.Equal(t, popBody.IgnoreWindows[0].EndTime, "17:00")
	assert.DeepEqual(t, popBody.IgnoreWindows[0].DaysOfWeek, []int32{0, 6})
	assert.Equal(t, popBody.IgnoreWindows[0].Timezone, "UTC")

	assert.Equal(t, popBody.IgnoreWindows[1].Name, "Night Shift")
	assert.Equal(t, popBody.IgnoreWindows[1].StartTime, "23:00")
	assert.Equal(t, popBody.IgnoreWindows[1].EndTime, "07:00")
	assert.DeepEqual(t, popBody.IgnoreWindows[1].DaysOfWeek, []int32{1, 2, 3, 4, 5})
	assert.Equal(t, popBody.IgnoreWindows[1].Timezone, "Asia/Tokyo")
}

func TestOpenAPIIgnoreWindowsCreate(t *testing.T) {
	s := setupTestDB(t)

	handler := openapi.HandlerFromMuxWithBaseURL(
		openapi.NewStrictHandler(httpapi.NewStrictHandler(httpapi.Dependencies{Store: s}), nil),
		http.NewServeMux(),
		"/api/v2",
	)

	// 1. Valid creation
	payload := `{"name":"Weekend Silence","startTime":"00:00","endTime":"24:00","daysOfWeek":[0,6],"timezone":"Asia/Tokyo"}`
	req := httptest.NewRequest(http.MethodPost, "/api/v2/ignore-windows", strings.NewReader(payload))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	assert.Equal(t, rec.Code, http.StatusOK, rec.Body.String())
	var createBody openapi.CreateIgnoreWindowResponse
	err := json.Unmarshal(rec.Body.Bytes(), &createBody)
	assert.NilError(t, err)
	assert.Assert(t, createBody.IgnoreWindow.Id != "")
	assert.Equal(t, createBody.IgnoreWindow.Name, "Weekend Silence")
	assert.Equal(t, createBody.IgnoreWindow.StartTime, "00:00")
	assert.Equal(t, createBody.IgnoreWindow.EndTime, "24:00")
	assert.DeepEqual(t, createBody.IgnoreWindow.DaysOfWeek, []int32{0, 6})
	assert.Equal(t, createBody.IgnoreWindow.Timezone, "Asia/Tokyo")

	// 2. Validation error on missing body (direct call and empty JSON via HTTP)
	strictH := httpapi.NewStrictHandler(httpapi.Dependencies{Store: s})
	respObj, err := strictH.IgnoreWindowsCreate(context.Background(), openapi.IgnoreWindowsCreateRequestObject{Body: nil})
	assert.NilError(t, err)
	create500, ok := respObj.(openapi.IgnoreWindowsCreate500JSONResponse)
	assert.Assert(t, ok)
	assert.Equal(t, create500.Code, "invalid_argument")

	req = httptest.NewRequest(http.MethodPost, "/api/v2/ignore-windows", strings.NewReader("{}"))
	req.Header.Set("Content-Type", "application/json")
	rec = httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	assert.Equal(t, rec.Code, http.StatusInternalServerError)
	var apiErr openapi.ApiError
	err = json.Unmarshal(rec.Body.Bytes(), &apiErr)
	assert.NilError(t, err)
	assert.Equal(t, apiErr.Code, "invalid_argument")

	// 3. Validation error on missing name
	req = httptest.NewRequest(http.MethodPost, "/api/v2/ignore-windows", strings.NewReader(`{"name":"","startTime":"09:00","endTime":"17:00","daysOfWeek":[1],"timezone":"UTC"}`))
	req.Header.Set("Content-Type", "application/json")
	rec = httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	assert.Equal(t, rec.Code, http.StatusInternalServerError)
	err = json.Unmarshal(rec.Body.Bytes(), &apiErr)
	assert.NilError(t, err)
	assert.Equal(t, apiErr.Code, "invalid_argument")

	// 4. Validation error on invalid time
	req = httptest.NewRequest(http.MethodPost, "/api/v2/ignore-windows", strings.NewReader(`{"name":"Invalid Time","startTime":"25:00","endTime":"17:00","daysOfWeek":[1],"timezone":"UTC"}`))
	req.Header.Set("Content-Type", "application/json")
	rec = httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	assert.Equal(t, rec.Code, http.StatusInternalServerError)
	err = json.Unmarshal(rec.Body.Bytes(), &apiErr)
	assert.NilError(t, err)
	assert.Equal(t, apiErr.Code, "invalid_argument")

	// 5. Validation error on invalid timezone
	req = httptest.NewRequest(http.MethodPost, "/api/v2/ignore-windows", strings.NewReader(`{"name":"Invalid TZ","startTime":"09:00","endTime":"17:00","daysOfWeek":[1],"timezone":"Invalid/Timezone"}`))
	req.Header.Set("Content-Type", "application/json")
	rec = httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	assert.Equal(t, rec.Code, http.StatusInternalServerError)
	err = json.Unmarshal(rec.Body.Bytes(), &apiErr)
	assert.NilError(t, err)
	assert.Equal(t, apiErr.Code, "invalid_argument")

	// 6. Validation error on invalid daysOfWeek
	req = httptest.NewRequest(http.MethodPost, "/api/v2/ignore-windows", strings.NewReader(`{"name":"Invalid Days","startTime":"09:00","endTime":"17:00","daysOfWeek":[7],"timezone":"UTC"}`))
	req.Header.Set("Content-Type", "application/json")
	rec = httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	assert.Equal(t, rec.Code, http.StatusInternalServerError)
	err = json.Unmarshal(rec.Body.Bytes(), &apiErr)
	assert.NilError(t, err)
	assert.Equal(t, apiErr.Code, "invalid_argument")

	// 7. Validation error on empty daysOfWeek
	req = httptest.NewRequest(http.MethodPost, "/api/v2/ignore-windows", strings.NewReader(`{"name":"Empty Days","startTime":"09:00","endTime":"17:00","daysOfWeek":[],"timezone":"UTC"}`))
	req.Header.Set("Content-Type", "application/json")
	rec = httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	assert.Equal(t, rec.Code, http.StatusInternalServerError)
	err = json.Unmarshal(rec.Body.Bytes(), &apiErr)
	assert.NilError(t, err)
	assert.Equal(t, apiErr.Code, "invalid_argument")

	// 8. Validation error on identical non-00:00 start and end times
	req = httptest.NewRequest(http.MethodPost, "/api/v2/ignore-windows", strings.NewReader(`{"name":"Same Time","startTime":"12:00","endTime":"12:00","daysOfWeek":[1],"timezone":"UTC"}`))
	req.Header.Set("Content-Type", "application/json")
	rec = httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	assert.Equal(t, rec.Code, http.StatusInternalServerError)
	err = json.Unmarshal(rec.Body.Bytes(), &apiErr)
	assert.NilError(t, err)
	assert.Equal(t, apiErr.Code, "invalid_argument")

	// 8b. Validation error on non-zero padded identical times ("9:00" vs "09:00")
	req = httptest.NewRequest(http.MethodPost, "/api/v2/ignore-windows", strings.NewReader(`{"name":"Same Time Unpadded","startTime":"9:00","endTime":"09:00","daysOfWeek":[1],"timezone":"UTC"}`))
	req.Header.Set("Content-Type", "application/json")
	rec = httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	assert.Equal(t, rec.Code, http.StatusInternalServerError)
	err = json.Unmarshal(rec.Body.Bytes(), &apiErr)
	assert.NilError(t, err)
	assert.Equal(t, apiErr.Code, "invalid_argument")

	// 9. Validation error on startTime == "24:00"
	req = httptest.NewRequest(http.MethodPost, "/api/v2/ignore-windows", strings.NewReader(`{"name":"Invalid Start 24","startTime":"24:00","endTime":"06:00","daysOfWeek":[1],"timezone":"UTC"}`))
	req.Header.Set("Content-Type", "application/json")
	rec = httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	assert.Equal(t, rec.Code, http.StatusInternalServerError)
	err = json.Unmarshal(rec.Body.Bytes(), &apiErr)
	assert.NilError(t, err)
	assert.Equal(t, apiErr.Code, "invalid_argument")

	// 10. Deduplication and sorting of daysOfWeek
	req = httptest.NewRequest(http.MethodPost, "/api/v2/ignore-windows", strings.NewReader(`{"name":"Dup Days","startTime":"09:00","endTime":"17:00","daysOfWeek":[3, 1, 3, 1, 5],"timezone":"UTC"}`))
	req.Header.Set("Content-Type", "application/json")
	rec = httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	assert.Equal(t, rec.Code, http.StatusOK)
	var dupDaysBody openapi.CreateIgnoreWindowResponse
	err = json.Unmarshal(rec.Body.Bytes(), &dupDaysBody)
	assert.NilError(t, err)
	assert.DeepEqual(t, dupDaysBody.IgnoreWindow.DaysOfWeek, []int32{1, 3, 5})
}

func TestOpenAPIIgnoreWindowsUpdate(t *testing.T) {
	ctx := context.Background()
	s := setupTestDB(t)

	win, err := s.CreateIgnoreWindow(ctx, store.CreateIgnoreWindowParams{
		ID:         "win-update-1",
		Name:       "Original Name",
		StartTime:  "08:00",
		EndTime:    "12:00",
		DaysOfWeek: "[1,2,3]",
		Timezone:   "UTC",
	})
	assert.NilError(t, err)

	handler := openapi.HandlerFromMuxWithBaseURL(
		openapi.NewStrictHandler(httpapi.NewStrictHandler(httpapi.Dependencies{Store: s}), nil),
		http.NewServeMux(),
		"/api/v2",
	)

	// 1. Full update
	updatePayload := `{"name":"Updated Name","startTime":"10:00","endTime":"18:00","daysOfWeek":[0,6],"timezone":"America/New_York"}`
	req := httptest.NewRequest(http.MethodPut, "/api/v2/ignore-windows/"+win.ID, strings.NewReader(updatePayload))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	assert.Equal(t, rec.Code, http.StatusOK, rec.Body.String())
	var updateBody openapi.UpdateIgnoreWindowResponse
	err = json.Unmarshal(rec.Body.Bytes(), &updateBody)
	assert.NilError(t, err)
	assert.Equal(t, updateBody.IgnoreWindow.Id, win.ID)
	assert.Equal(t, updateBody.IgnoreWindow.Name, "Updated Name")
	assert.Equal(t, updateBody.IgnoreWindow.StartTime, "10:00")
	assert.Equal(t, updateBody.IgnoreWindow.EndTime, "18:00")
	assert.DeepEqual(t, updateBody.IgnoreWindow.DaysOfWeek, []int32{0, 6})
	assert.Equal(t, updateBody.IgnoreWindow.Timezone, "America/New_York")

	// 2. Partial update (name only)
	partialPayload := `{"name":"Second Name"}`
	req = httptest.NewRequest(http.MethodPut, "/api/v2/ignore-windows/"+win.ID, strings.NewReader(partialPayload))
	req.Header.Set("Content-Type", "application/json")
	rec = httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	assert.Equal(t, rec.Code, http.StatusOK, rec.Body.String())
	err = json.Unmarshal(rec.Body.Bytes(), &updateBody)
	assert.NilError(t, err)
	assert.Equal(t, updateBody.IgnoreWindow.Name, "Second Name")
	assert.Equal(t, updateBody.IgnoreWindow.StartTime, "10:00")
	assert.Equal(t, updateBody.IgnoreWindow.EndTime, "18:00")
	assert.DeepEqual(t, updateBody.IgnoreWindow.DaysOfWeek, []int32{0, 6})
	assert.Equal(t, updateBody.IgnoreWindow.Timezone, "America/New_York")

	// 3. Validation error on invalid time in update
	badTimePayload := `{"startTime":"invalid-time"}`
	req = httptest.NewRequest(http.MethodPut, "/api/v2/ignore-windows/"+win.ID, strings.NewReader(badTimePayload))
	req.Header.Set("Content-Type", "application/json")
	rec = httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	assert.Equal(t, rec.Code, http.StatusInternalServerError)
	var apiErr openapi.ApiError
	err = json.Unmarshal(rec.Body.Bytes(), &apiErr)
	assert.NilError(t, err)
	assert.Equal(t, apiErr.Code, "invalid_argument")

	// 4. Validation error on invalid timezone in update
	badTZPayload := `{"timezone":"Nonexistent/Zone"}`
	req = httptest.NewRequest(http.MethodPut, "/api/v2/ignore-windows/"+win.ID, strings.NewReader(badTZPayload))
	req.Header.Set("Content-Type", "application/json")
	rec = httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	assert.Equal(t, rec.Code, http.StatusInternalServerError)
	err = json.Unmarshal(rec.Body.Bytes(), &apiErr)
	assert.NilError(t, err)
	assert.Equal(t, apiErr.Code, "invalid_argument")

	// 5. Validation error on startTime == "24:00" in update
	badStart24Payload := `{"startTime":"24:00"}`
	req = httptest.NewRequest(http.MethodPut, "/api/v2/ignore-windows/"+win.ID, strings.NewReader(badStart24Payload))
	req.Header.Set("Content-Type", "application/json")
	rec = httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	assert.Equal(t, rec.Code, http.StatusInternalServerError)
	err = json.Unmarshal(rec.Body.Bytes(), &apiErr)
	assert.NilError(t, err)
	assert.Equal(t, apiErr.Code, "invalid_argument")

	// 6. Deduplication and sorting of daysOfWeek in update
	dupDaysUpdate := `{"daysOfWeek":[5, 2, 5, 2]}`
	req = httptest.NewRequest(http.MethodPut, "/api/v2/ignore-windows/"+win.ID, strings.NewReader(dupDaysUpdate))
	req.Header.Set("Content-Type", "application/json")
	rec = httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	assert.Equal(t, rec.Code, http.StatusOK)
	err = json.Unmarshal(rec.Body.Bytes(), &updateBody)
	assert.NilError(t, err)
	assert.DeepEqual(t, updateBody.IgnoreWindow.DaysOfWeek, []int32{2, 5})
}

func TestOpenAPIIgnoreWindowsDelete(t *testing.T) {
	ctx := context.Background()
	s := setupTestDB(t)

	win, err := s.CreateIgnoreWindow(ctx, store.CreateIgnoreWindowParams{
		ID:         "win-del-1",
		Name:       "To Be Deleted",
		StartTime:  "01:00",
		EndTime:    "02:00",
		DaysOfWeek: "[0]",
		Timezone:   "UTC",
	})
	assert.NilError(t, err)

	_, err = s.CreateFeed(ctx, store.CreateFeedParams{ID: "feed-del-1", Url: "https://example.com/feed.xml"})
	assert.NilError(t, err)
	_, err = s.CreateTag(ctx, store.CreateTagParams{ID: "tag-del-1", Name: "TagDel"})
	assert.NilError(t, err)

	handler := openapi.HandlerFromMuxWithBaseURL(
		openapi.NewStrictHandler(httpapi.NewStrictHandler(httpapi.Dependencies{Store: s}), nil),
		http.NewServeMux(),
		"/api/v2",
	)

	// Associate window to feed and tag
	feedManageReq := httptest.NewRequest(http.MethodPost, "/api/v2/feed-ignore-windows/manage", strings.NewReader(`{"feedIds":["feed-del-1"],"addIgnoreWindowIds":["win-del-1"],"removeIgnoreWindowIds":[]}`))
	feedManageReq.Header.Set("Content-Type", "application/json")
	feedManageRec := httptest.NewRecorder()
	handler.ServeHTTP(feedManageRec, feedManageReq)
	assert.Equal(t, feedManageRec.Code, http.StatusOK, feedManageRec.Body.String())

	tagManageReq := httptest.NewRequest(http.MethodPost, "/api/v2/tag-ignore-windows/manage", strings.NewReader(`{"tagIds":["tag-del-1"],"addIgnoreWindowIds":["win-del-1"],"removeIgnoreWindowIds":[]}`))
	tagManageReq.Header.Set("Content-Type", "application/json")
	tagManageRec := httptest.NewRecorder()
	handler.ServeHTTP(tagManageRec, tagManageReq)
	assert.Equal(t, tagManageRec.Code, http.StatusOK, tagManageRec.Body.String())

	// Delete ignore window
	delReq := httptest.NewRequest(http.MethodDelete, "/api/v2/ignore-windows/"+win.ID, nil)
	delRec := httptest.NewRecorder()
	handler.ServeHTTP(delRec, delReq)
	assert.Equal(t, delRec.Code, http.StatusOK, delRec.Body.String())

	// Verify window is deleted
	listReq := httptest.NewRequest(http.MethodGet, "/api/v2/ignore-windows", nil)
	listRec := httptest.NewRecorder()
	handler.ServeHTTP(listRec, listReq)
	assert.Equal(t, listRec.Code, http.StatusOK)
	var listBody openapi.ListIgnoreWindowsResponse
	err = json.Unmarshal(listRec.Body.Bytes(), &listBody)
	assert.NilError(t, err)
	assert.Equal(t, len(listBody.IgnoreWindows), 0)

	// Verify cascade deletion of feed associations
	feedListReq := httptest.NewRequest(http.MethodGet, "/api/v2/feed-ignore-windows?ignoreWindowId="+win.ID, nil)
	feedListRec := httptest.NewRecorder()
	handler.ServeHTTP(feedListRec, feedListReq)
	assert.Equal(t, feedListRec.Code, http.StatusOK)
	var feedListBody openapi.ListFeedIgnoreWindowsResponse
	err = json.Unmarshal(feedListRec.Body.Bytes(), &feedListBody)
	assert.NilError(t, err)
	assert.Equal(t, len(feedListBody.FeedIgnoreWindows), 0)

	// Verify cascade deletion of tag associations
	tagListReq := httptest.NewRequest(http.MethodGet, "/api/v2/tag-ignore-windows?ignoreWindowId="+win.ID, nil)
	tagListRec := httptest.NewRecorder()
	handler.ServeHTTP(tagListRec, tagListReq)
	assert.Equal(t, tagListRec.Code, http.StatusOK)
	var tagListBody openapi.ListTagIgnoreWindowsResponse
	err = json.Unmarshal(tagListRec.Body.Bytes(), &tagListBody)
	assert.NilError(t, err)
	assert.Equal(t, len(tagListBody.TagIgnoreWindows), 0)
}

func TestOpenAPIListAndManageFeedIgnoreWindows(t *testing.T) {
	ctx := context.Background()
	s := setupTestDB(t)

	_, err := s.CreateFeed(ctx, store.CreateFeedParams{ID: "feed-1", Url: "https://example.com/f1.xml"})
	assert.NilError(t, err)
	_, err = s.CreateFeed(ctx, store.CreateFeedParams{ID: "feed-2", Url: "https://example.com/f2.xml"})
	assert.NilError(t, err)

	_, err = s.CreateIgnoreWindow(ctx, store.CreateIgnoreWindowParams{
		ID:         "win-1",
		Name:       "W1",
		StartTime:  "00:00",
		EndTime:    "06:00",
		DaysOfWeek: "[]",
		Timezone:   "UTC",
	})
	assert.NilError(t, err)
	_, err = s.CreateIgnoreWindow(ctx, store.CreateIgnoreWindowParams{
		ID:         "win-2",
		Name:       "W2",
		StartTime:  "12:00",
		EndTime:    "13:00",
		DaysOfWeek: "[]",
		Timezone:   "UTC",
	})
	assert.NilError(t, err)

	handler := openapi.HandlerFromMuxWithBaseURL(
		openapi.NewStrictHandler(httpapi.NewStrictHandler(httpapi.Dependencies{Store: s}), nil),
		http.NewServeMux(),
		"/api/v2",
	)

	// 1. Add associations
	manageReq := httptest.NewRequest(http.MethodPost, "/api/v2/feed-ignore-windows/manage", strings.NewReader(`{"feedIds":["feed-1","feed-2"],"addIgnoreWindowIds":["win-1","win-2"],"removeIgnoreWindowIds":[]}`))
	manageReq.Header.Set("Content-Type", "application/json")
	manageRec := httptest.NewRecorder()
	handler.ServeHTTP(manageRec, manageReq)
	assert.Equal(t, manageRec.Code, http.StatusOK, manageRec.Body.String())

	// 2. List all
	listReq := httptest.NewRequest(http.MethodGet, "/api/v2/feed-ignore-windows", nil)
	listRec := httptest.NewRecorder()
	handler.ServeHTTP(listRec, listReq)
	assert.Equal(t, listRec.Code, http.StatusOK)
	var listBody openapi.ListFeedIgnoreWindowsResponse
	err = json.Unmarshal(listRec.Body.Bytes(), &listBody)
	assert.NilError(t, err)
	assert.Equal(t, len(listBody.FeedIgnoreWindows), 4)

	// 3. List by feedId
	listFeed1Req := httptest.NewRequest(http.MethodGet, "/api/v2/feed-ignore-windows?feedId=feed-1", nil)
	listFeed1Rec := httptest.NewRecorder()
	handler.ServeHTTP(listFeed1Rec, listFeed1Req)
	assert.Equal(t, listFeed1Rec.Code, http.StatusOK)
	var listFeed1Body openapi.ListFeedIgnoreWindowsResponse
	err = json.Unmarshal(listFeed1Rec.Body.Bytes(), &listFeed1Body)
	assert.NilError(t, err)
	assert.Equal(t, len(listFeed1Body.FeedIgnoreWindows), 2)

	// 4. Remove one association
	removeReq := httptest.NewRequest(http.MethodPost, "/api/v2/feed-ignore-windows/manage", strings.NewReader(`{"feedIds":["feed-1"],"addIgnoreWindowIds":[],"removeIgnoreWindowIds":["win-1"]}`))
	removeReq.Header.Set("Content-Type", "application/json")
	removeRec := httptest.NewRecorder()
	handler.ServeHTTP(removeRec, removeReq)
	assert.Equal(t, removeRec.Code, http.StatusOK, removeRec.Body.String())

	// Verify removal for feed-1
	listFeed1Req = httptest.NewRequest(http.MethodGet, "/api/v2/feed-ignore-windows?feedId=feed-1", nil)
	listFeed1Rec = httptest.NewRecorder()
	handler.ServeHTTP(listFeed1Rec, listFeed1Req)
	assert.Equal(t, listFeed1Rec.Code, http.StatusOK)
	err = json.Unmarshal(listFeed1Rec.Body.Bytes(), &listFeed1Body)
	assert.NilError(t, err)
	assert.Equal(t, len(listFeed1Body.FeedIgnoreWindows), 1)
	assert.Equal(t, listFeed1Body.FeedIgnoreWindows[0].IgnoreWindowId, "win-2")
}

func TestOpenAPIListAndManageTagIgnoreWindows(t *testing.T) {
	ctx := context.Background()
	s := setupTestDB(t)

	_, err := s.CreateTag(ctx, store.CreateTagParams{ID: "tag-1", Name: "Tag1"})
	assert.NilError(t, err)
	_, err = s.CreateTag(ctx, store.CreateTagParams{ID: "tag-2", Name: "Tag2"})
	assert.NilError(t, err)

	_, err = s.CreateIgnoreWindow(ctx, store.CreateIgnoreWindowParams{
		ID:         "win-1",
		Name:       "W1",
		StartTime:  "00:00",
		EndTime:    "06:00",
		DaysOfWeek: "[]",
		Timezone:   "UTC",
	})
	assert.NilError(t, err)

	handler := openapi.HandlerFromMuxWithBaseURL(
		openapi.NewStrictHandler(httpapi.NewStrictHandler(httpapi.Dependencies{Store: s}), nil),
		http.NewServeMux(),
		"/api/v2",
	)

	// 1. Add associations
	manageReq := httptest.NewRequest(http.MethodPost, "/api/v2/tag-ignore-windows/manage", strings.NewReader(`{"tagIds":["tag-1","tag-2"],"addIgnoreWindowIds":["win-1"],"removeIgnoreWindowIds":[]}`))
	manageReq.Header.Set("Content-Type", "application/json")
	manageRec := httptest.NewRecorder()
	handler.ServeHTTP(manageRec, manageReq)
	assert.Equal(t, manageRec.Code, http.StatusOK, manageRec.Body.String())

	// 2. List all
	listReq := httptest.NewRequest(http.MethodGet, "/api/v2/tag-ignore-windows", nil)
	listRec := httptest.NewRecorder()
	handler.ServeHTTP(listRec, listReq)
	assert.Equal(t, listRec.Code, http.StatusOK)
	var listBody openapi.ListTagIgnoreWindowsResponse
	err = json.Unmarshal(listRec.Body.Bytes(), &listBody)
	assert.NilError(t, err)
	assert.Equal(t, len(listBody.TagIgnoreWindows), 2)

	// 3. List by tagId
	listTag1Req := httptest.NewRequest(http.MethodGet, "/api/v2/tag-ignore-windows?tagId=tag-1", nil)
	listTag1Rec := httptest.NewRecorder()
	handler.ServeHTTP(listTag1Rec, listTag1Req)
	assert.Equal(t, listTag1Rec.Code, http.StatusOK)
	var listTag1Body openapi.ListTagIgnoreWindowsResponse
	err = json.Unmarshal(listTag1Rec.Body.Bytes(), &listTag1Body)
	assert.NilError(t, err)
	assert.Equal(t, len(listTag1Body.TagIgnoreWindows), 1)

	// 4. Remove association from tag-1
	removeReq := httptest.NewRequest(http.MethodPost, "/api/v2/tag-ignore-windows/manage", strings.NewReader(`{"tagIds":["tag-1"],"addIgnoreWindowIds":[],"removeIgnoreWindowIds":["win-1"]}`))
	removeReq.Header.Set("Content-Type", "application/json")
	removeRec := httptest.NewRecorder()
	handler.ServeHTTP(removeRec, removeReq)
	assert.Equal(t, removeRec.Code, http.StatusOK, removeRec.Body.String())

	// Verify removal for tag-1
	listTag1Req = httptest.NewRequest(http.MethodGet, "/api/v2/tag-ignore-windows?tagId=tag-1", nil)
	listTag1Rec = httptest.NewRecorder()
	handler.ServeHTTP(listTag1Rec, listTag1Req)
	assert.Equal(t, listTag1Rec.Code, http.StatusOK)
	err = json.Unmarshal(listTag1Rec.Body.Bytes(), &listTag1Body)
	assert.NilError(t, err)
	assert.Equal(t, len(listTag1Body.TagIgnoreWindows), 0)

	// Verify tag-2 still has win-1
	listTag2Req := httptest.NewRequest(http.MethodGet, "/api/v2/tag-ignore-windows?tagId=tag-2", nil)
	listTag2Rec := httptest.NewRecorder()
	handler.ServeHTTP(listTag2Rec, listTag2Req)
	assert.Equal(t, listTag2Rec.Code, http.StatusOK)
	var listTag2Body openapi.ListTagIgnoreWindowsResponse
	err = json.Unmarshal(listTag2Rec.Body.Bytes(), &listTag2Body)
	assert.NilError(t, err)
	assert.Equal(t, len(listTag2Body.TagIgnoreWindows), 1)
}
