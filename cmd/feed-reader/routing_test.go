package main

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/nakatanakatana/feed-reader/gen/go/feed/v1/feedv1connect"
	"gotest.tools/v3/assert"
)

func TestRouting(t *testing.T) {
	// Setup dependencies using helpers from handler_test.go
	_, db := setupTestDB(t)
	fetcher := &mockFetcher{}
	itemFetcher := &mockItemFetcher{}

	// Create the server
	server, _ := setupServer(t, db, nil, fetcher, itemFetcher)

	// Create the handler
	path, handler := feedv1connect.NewFeedServiceHandler(server)

	// Setup the mux (simulating main.go)
	mux := http.NewServeMux()
	mux.Handle("/api"+path, http.StripPrefix("/api", handler))

	// Create a test server
	ts := httptest.NewServer(mux)
	defer ts.Close()

	t.Run("Root path routing", func(t *testing.T) {
		// ListFeeds is "/feed.v1.FeedService/ListFeeds"
		url := ts.URL + feedv1connect.FeedServiceListFeedsProcedure

		resp, err := http.Post(url, "application/json", strings.NewReader("{}"))
		assert.NilError(t, err, "Failed to make request")
		defer func() { _ = resp.Body.Close() }()

		// Should fail (404 NotFound) on root path after update
		assert.Equal(t, resp.StatusCode, http.StatusNotFound, "Expected status NotFound on root path %s, got %v", url, resp.Status)
	})

	t.Run("API prefix routing", func(t *testing.T) {
		// Should work on /api after update
		url := ts.URL + "/api" + feedv1connect.FeedServiceListFeedsProcedure

		resp, err := http.Post(url, "application/json", strings.NewReader("{}"))
		assert.NilError(t, err, "Failed to make request")
		defer func() { _ = resp.Body.Close() }()

		// Should succeed (200 OK) on /api path
		assert.Equal(t, resp.StatusCode, http.StatusOK, "Expected status OK on /api path %s, got %v", url, resp.Status)
	})
}
