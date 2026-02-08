package main

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"connectrpc.com/connect"
	"github.com/nakatanakatana/feed-reader/gen/go/item/v1"
	"github.com/nakatanakatana/feed-reader/gen/go/item/v1/itemv1connect"
	"github.com/nakatanakatana/feed-reader/store"
	"github.com/stretchr/testify/require"
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

	t.Run("ListItems snapshot", func(t *testing.T) {
		// Add some data
		ctx := context.Background()
		_, err := s.CreateFeed(ctx, store.CreateFeedParams{ID: "f1", Url: "u1"})
		require.NoError(t, err)
		err = s.SaveFetchedItem(ctx, store.SaveFetchedItemParams{FeedID: "f1", Url: "i1", Title: func() *string { s := "Item 1"; return &s }()})
		require.NoError(t, err)

		client := itemv1connect.NewItemServiceClient(http.DefaultClient, ts.URL+"/api")
		res, err := client.ListItems(ctx, connect.NewRequest(&itemv1.ListItemsRequest{}))
		require.NoError(t, err)

		assertResponseGolden(t, res.Msg, "item_routing_list_items.golden")
	})
}
