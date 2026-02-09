package main

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"

	"connectrpc.com/connect"
	"github.com/nakatanakatana/feed-reader/gen/go/item/v1"
	"github.com/nakatanakatana/feed-reader/gen/go/item/v1/itemv1connect"
	"github.com/nakatanakatana/feed-reader/store"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestListItems_ReturnsUrl(t *testing.T) {
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

	// Add test data
	ctx := context.Background()
	_, err := s.CreateFeed(ctx, store.CreateFeedParams{ID: "f1", Url: "u1"})
	require.NoError(t, err)

	expectedUrl := "https://example.com/article"
	err = s.SaveFetchedItem(ctx, store.SaveFetchedItemParams{
		FeedID: "f1",
		Url:    expectedUrl,
		Title:  func() *string { s := "Item 1"; return &s }(),
	})
	require.NoError(t, err)

	// Call ListItems
	client := itemv1connect.NewItemServiceClient(http.DefaultClient, ts.URL+"/api")
	res, err := client.ListItems(ctx, connect.NewRequest(&itemv1.ListItemsRequest{}))
	require.NoError(t, err)

	// Assertions
	require.Len(t, res.Msg.Items, 1)
	assert.Equal(t, expectedUrl, res.Msg.Items[0].Url, "ListItems should return the item URL")
}
