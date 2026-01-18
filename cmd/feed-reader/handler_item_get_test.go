package main

import (
	"context"
	"testing"

	"connectrpc.com/connect"
	feedv1 "github.com/nakatanakatana/feed-reader/gen/go/feed/v1"
	"github.com/nakatanakatana/feed-reader/store"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"google.golang.org/protobuf/proto"
)

func TestFeedServer_GetItem(t *testing.T) {
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
		ID:          "item-1",
		Url:         "http://example.com/item1",
		Title:       proto.String("Title 1"),
		Content:     proto.String("Content 1"),
		Description: proto.String("Desc 1"),
		Author:      proto.String("Author 1"),
		PublishedAt: proto.String("2026-01-18T10:00:00Z"),
	})
	require.NoError(t, err)

	err = queries.CreateFeedItem(ctx, store.CreateFeedItemParams{
		FeedID: "feed-1",
		ItemID: "item-1",
	})
	require.NoError(t, err)

	err = queries.CreateItemEnclosure(ctx, store.CreateItemEnclosureParams{
		ItemID: "item-1",
		Url:    "http://example.com/audio.mp3",
	})
	require.NoError(t, err)

	t.Run("Get item success", func(t *testing.T) {
		req := connect.NewRequest(&feedv1.GetItemRequest{
			Id: "item-1",
		})
		res, err := server.GetItem(ctx, req)
		require.NoError(t, err)
		
		item := res.Msg.Item
		assert.Equal(t, "item-1", item.Id)
		assert.Equal(t, "feed-1", item.FeedId)
		assert.Equal(t, "Title 1", item.Title)
		assert.Equal(t, "Content 1", item.Content)
		assert.Equal(t, "Author 1", item.Author)
		assert.Equal(t, []string{"http://example.com/audio.mp3"}, item.Enclosures)
		assert.False(t, item.IsRead)
	})

	t.Run("Item not found", func(t *testing.T) {
		req := connect.NewRequest(&feedv1.GetItemRequest{
			Id: "non-existent",
		})
		_, err := server.GetItem(ctx, req)
		require.Error(t, err)
		assert.Equal(t, connect.CodeNotFound, connect.CodeOf(err))
	})
}
