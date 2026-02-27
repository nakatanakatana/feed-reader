package main

import (
	"log/slog"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/nakatanakatana/feed-reader/store"
	"connectrpc.com/otelconnect"
	"gotest.tools/v3/assert"
)

func TestCORS_Integration(t *testing.T) {
	_, db := setupTestDB(t)
	s := store.NewStore(db)
	fetcher := &mockFetcher{}
	itemFetcher := &mockItemFetcher{}
	importer := NewOPMLImporter(s, fetcher, slog.Default(), nil)
	otelInterceptor, _ := otelconnect.NewInterceptor()

	allowedOrigins := []string{"http://localhost:3000"}
	handler := NewMux(s, fetcher, itemFetcher, importer, otelInterceptor, allowedOrigins)
	
	ts := httptest.NewServer(handler)
	defer ts.Close()

	t.Run("Preflight OPTIONS request", func(t *testing.T) {
		req, _ := http.NewRequest(http.MethodOptions, ts.URL+"/api/feed.v1.FeedService/ListFeeds", nil)
		req.Header.Set("Origin", "http://localhost:3000")
		req.Header.Set("Access-Control-Request-Method", "POST")

		client := &http.Client{}
		resp, err := client.Do(req)
		assert.NilError(t, err)
		defer func() { _ = resp.Body.Close() }()

		// If NewMux doesn't wrap with CORS, this will fail (StatusNotFound or StatusOK without CORS headers)
		assert.Equal(t, resp.StatusCode, http.StatusNoContent)
		assert.Equal(t, resp.Header.Get("Access-Control-Allow-Origin"), "http://localhost:3000")
	})
}
