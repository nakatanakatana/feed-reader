package main

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/nakatanakatana/feed-reader/gen/go/item/v1/itemv1connect"
	"github.com/nakatanakatana/feed-reader/store"
)

func TestItemRouting(t *testing.T) {
	// Setup dependencies
	_, db := setupTestDB(t)
	s := store.NewStore(db)

	// Create the server
	server := NewItemServer(s)

	// Create the handler
	path, handler := itemv1connect.NewItemServiceHandler(server)

	// Setup the mux
	mux := http.NewServeMux()
	mux.Handle("/api"+path, http.StripPrefix("/api", handler))

	// Create a test server
	ts := httptest.NewServer(mux)
	defer ts.Close()

	t.Run("Item API prefix routing", func(t *testing.T) {
		url := ts.URL + "/api" + itemv1connect.ItemServiceListItemsProcedure

		resp, err := http.Post(url, "application/json", strings.NewReader("{}"))
		if err != nil {
			t.Fatalf("Failed to make request: %v", err)
		}
		defer func() { _ = resp.Body.Close() }()

		if resp.StatusCode != http.StatusOK {
			t.Errorf("Expected status OK on /api path %s, got %v", url, resp.Status)
		}
	})
}
