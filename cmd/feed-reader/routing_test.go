package main

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/nakatanakatana/feed-reader/gen/go/feed/v1/feedv1connect"
)

func TestRouting(t *testing.T) {
	// Setup dependencies using helpers from handler_test.go
	queries, _ := setupTestDB(t)
	fetcher := &mockFetcher{}
	itemFetcher := &mockItemFetcher{}
	
	// Create the server
	server := NewFeedServer(queries, mockUUIDGenerator{}, fetcher, itemFetcher)
	
	// Create the handler
	path, handler := feedv1connect.NewFeedServiceHandler(server)

	// Setup the mux (simulating main.go)
	mux := http.NewServeMux()
	mux.Handle(path, handler)

	// Create a test server
	ts := httptest.NewServer(mux)
	defer ts.Close()

	t.Run("Root path routing", func(t *testing.T) {
		// ListFeeds is "/feed.v1.FeedService/ListFeeds"
		url := ts.URL + feedv1connect.FeedServiceListFeedsProcedure
		
		resp, err := http.Post(url, "application/json", strings.NewReader("{}"))
		if err != nil {
			t.Fatalf("Failed to make request: %v", err)
		}
		defer resp.Body.Close()

		// Should succeed (200 OK) on root path currently
		if resp.StatusCode != http.StatusOK {
			t.Errorf("Expected status OK on root path %s, got %v", url, resp.Status)
		}
	})

	t.Run("API prefix routing (negative test)", func(t *testing.T) {
		// Should NOT work on /api yet
		url := ts.URL + "/api" + feedv1connect.FeedServiceListFeedsProcedure
		
		resp, err := http.Post(url, "application/json", strings.NewReader("{}"))
		if err != nil {
			t.Fatalf("Failed to make request: %v", err)
		}
		defer resp.Body.Close()

		// Should fail (404 NotFound) on /api path currently
		if resp.StatusCode != http.StatusNotFound {
			t.Errorf("Expected status NotFound on /api path %s, got %v", url, resp.Status)
		}
	})
}
