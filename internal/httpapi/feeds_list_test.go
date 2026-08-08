package httpapi_test

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/nakatanakatana/feed-reader/gen/openapi"
	"github.com/nakatanakatana/feed-reader/internal/httpapi"
	"github.com/nakatanakatana/feed-reader/store"
	"gotest.tools/v3/assert"
)

func TestFeedsList(t *testing.T) {
	ctx := context.Background()
	s := setupTestDB(t)
	_, err := s.CreateFeed(ctx, store.CreateFeedParams{
		ID:  "feed-1",
		Url: "https://example.com/feed.xml",
	})
	assert.NilError(t, err)

	handler := openapi.HandlerFromMuxWithBaseURL(
		openapi.NewStrictHandler(httpapi.NewStrictHandler(httpapi.Dependencies{Store: s}), nil),
		http.NewServeMux(),
		"/api/v2",
	)

	req := httptest.NewRequest(http.MethodGet, "/api/v2/feeds", nil)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	assert.Equal(t, rec.Code, http.StatusOK, rec.Body.String())

	var body openapi.ListFeedsResponse
	err = json.Unmarshal(rec.Body.Bytes(), &body)
	assert.NilError(t, err)
	assert.Equal(t, len(body.Feeds), 1)
	assert.Equal(t, body.Feeds[0].Id, "feed-1")
	assert.Equal(t, body.Feeds[0].Url, "https://example.com/feed.xml")
}
