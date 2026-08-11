package main

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"testing/fstest"

	"github.com/nakatanakatana/feed-reader/internal/httpapi"
	"github.com/nakatanakatana/feed-reader/store"
	"gotest.tools/v3/assert"
)

func TestMuxDoesNotServeConnectV1Routes(t *testing.T) {
	_, db := setupTestDB(t)
	s := store.NewStore(db)
	handler := httpapi.NewMux(httpapi.Dependencies{
		Store:  s,
		Assets: fstest.MapFS{"index.html": &fstest.MapFile{Data: []byte("ok")}},
	})

	req := httptest.NewRequest(http.MethodPost, "/api/feed.v1.FeedService/ListFeeds", nil)
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	assert.Equal(t, rec.Code, http.StatusNotFound)
}
