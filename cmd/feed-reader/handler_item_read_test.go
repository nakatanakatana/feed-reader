package main

import (
	"context"
	"testing"

	"connectrpc.com/connect"
	"github.com/nakatanakatana/feed-reader/gen/go/feed/v1"
	"github.com/nakatanakatana/feed-reader/store"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestFeedServer_MarkItemRead(t *testing.T) {
	ctx := context.Background()
	queries := setupTestDB(t)
	server := NewFeedServer(queries, nil, nil)

	// Seed data
	_, err := queries.CreateFeed(ctx, store.CreateFeedParams{
		Uuid: "feed-1",
		Url:  "http://example.com/feed1",
	})
	require.NoError(t, err)

	_, err = queries.CreateItem(ctx, store.CreateItemParams{
		ID:  "item-1",
		Url: "http://example.com/item1",
	})
	require.NoError(t, err)

	err = queries.CreateFeedItem(ctx, store.CreateFeedItemParams{
		FeedID: "feed-1",
		ItemID: "item-1",
	})
	require.NoError(t, err)

	t.Run("Mark item as read", func(t *testing.T) {
		req := connect.NewRequest(&feedv1.MarkItemReadRequest{
			Id: "item-1",
		})
		_, err := server.MarkItemRead(ctx, req)
		require.NoError(t, err)

		// Verify read status
		item, err := queries.GetItem(ctx, "item-1")
		require.NoError(t, err)
		assert.Equal(t, int64(1), item.IsRead)
	})

	t.Run("Item not found", func(t *testing.T) {
		req := connect.NewRequest(&feedv1.MarkItemReadRequest{
			Id: "non-existent",
		})
		_, err := server.MarkItemRead(ctx, req)
		require.Error(t, err)
		assert.Equal(t, connect.CodeNotFound, connect.CodeOf(err))
	})
}