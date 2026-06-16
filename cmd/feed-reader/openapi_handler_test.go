package main

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/mmcdole/gofeed"
	"github.com/nakatanakatana/feed-reader/gen/openapi"
	"github.com/nakatanakatana/feed-reader/store"
	"gotest.tools/v3/assert"
)

func TestOpenAPIListTags(t *testing.T) {
	ctx := context.Background()
	_, db := setupTestDB(t)
	s := store.NewStore(db)

	tag, err := s.CreateTag(ctx, store.CreateTagParams{ID: "tag-1", Name: "Tech"})
	assert.NilError(t, err)
	assert.Assert(t, tag.ID != "")

	handler := openapi.HandlerFromMuxWithBaseURL(
		openapi.NewStrictHandler(NewOpenAPIHandler(s), nil),
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
	_, db := setupTestDB(t)
	s := store.NewStore(db)
	handler := openapi.HandlerFromMuxWithBaseURL(
		openapi.NewStrictHandler(NewOpenAPIHandler(s), nil),
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
	_, db := setupTestDB(t)
	s := store.NewStore(db)
	_, err := s.CreateFeed(ctx, store.CreateFeedParams{ID: "feed-1", Url: "https://example.com/feed.xml"})
	assert.NilError(t, err)
	_, err = s.CreateTag(ctx, store.CreateTagParams{ID: "tag-1", Name: "Tech"})
	assert.NilError(t, err)
	handler := openapi.HandlerFromMuxWithBaseURL(
		openapi.NewStrictHandler(NewOpenAPIHandler(s), nil),
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
	_, db := setupTestDB(t)
	s := store.NewStore(db)
	title := "Example Feed"
	_, err := s.CreateFeed(ctx, store.CreateFeedParams{ID: "feed-1", Url: "https://example.com/feed.xml", Title: &title})
	assert.NilError(t, err)
	handler := openapi.HandlerFromMuxWithBaseURL(
		openapi.NewStrictHandler(NewOpenAPIHandler(s), nil),
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
	_, db := setupTestDB(t)
	s := store.NewStore(db)
	_, err := s.CreateItem(ctx, store.CreateItemParams{ID: "item-1", Url: "https://example.com/item"})
	assert.NilError(t, err)
	_, err = s.SetItemRead(ctx, store.SetItemReadParams{ItemID: "item-1", IsRead: 1})
	assert.NilError(t, err)
	handler := openapi.HandlerFromMuxWithBaseURL(
		openapi.NewStrictHandler(NewOpenAPIHandler(s), nil),
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
	_, db := setupTestDB(t)
	s := store.NewStore(db)

	handler := openapi.HandlerFromMuxWithBaseURL(
		openapi.NewStrictHandler(NewOpenAPIHandler(s), nil),
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
	_, db := setupTestDB(t)
	s := store.NewStore(db)

	_, err := s.CreateFeed(ctx, store.CreateFeedParams{ID: "feed-1", Url: "https://example.com/feed.xml"})
	assert.NilError(t, err)
	_, err = s.CreateItem(ctx, store.CreateItemParams{ID: "item-1", Url: "https://example.com/item"})
	assert.NilError(t, err)
	err = s.CreateFeedItem(ctx, store.CreateFeedItemParams{FeedID: "feed-1", ItemID: "item-1"})
	assert.NilError(t, err)
	_, err = s.SetItemRead(ctx, store.SetItemReadParams{ItemID: "item-1", IsRead: 0})
	assert.NilError(t, err)

	handler := openapi.HandlerFromMuxWithBaseURL(
		openapi.NewStrictHandler(NewOpenAPIHandler(s), nil),
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

func TestOpenAPIImportOpmlReturnsSummary(t *testing.T) {
	ctx := context.Background()
	_, db := setupTestDB(t)
	s := store.NewStore(db)
	fetcher := &mockFetcher{feed: &gofeed.Feed{Title: "Imported Feed"}}
	opmlImporter := NewOPMLImporter(s, fetcher, slog.Default(), nil)

	handler := openapi.HandlerFromMuxWithBaseURL(
		openapi.NewStrictHandler(NewOpenAPIHandler(
			s,
			WithOpenAPIFetcher(fetcher),
			WithOpenAPIOPMLImporter(opmlImporter),
		), nil),
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
	_, db := setupTestDB(t)
	s := store.NewStore(db)

	_, err := s.CreateURLParsingRule(ctx, store.CreateURLParsingRuleParams{
		ID:       "url-rule-1",
		Domain:   "example.com",
		RuleType: "subdomain",
		Pattern:  "example.com",
	})
	assert.NilError(t, err)

	handler := openapi.HandlerFromMuxWithBaseURL(
		openapi.NewStrictHandler(NewOpenAPIHandler(s), nil),
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
	_, db := setupTestDB(t)
	s := store.NewStore(db)

	handler := openapi.HandlerFromMuxWithBaseURL(
		openapi.NewStrictHandler(NewOpenAPIHandler(s), nil),
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
	_, db := setupTestDB(t)
	s := store.NewStore(db)

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
		openapi.NewStrictHandler(NewOpenAPIHandler(s), nil),
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

