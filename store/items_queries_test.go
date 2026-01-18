package store_test

import (
	"context"
	"testing"
	"time"

	"github.com/nakatanakatana/feed-reader/store"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestQueries_ItemDelivery(t *testing.T) {
	q := setupDB(t)
	ctx := context.Background()

	// Setup Data
	feed1 := store.CreateFeedParams{Uuid: "feed-1", Url: "http://example.com/feed1"}
	_, err := q.CreateFeed(ctx, feed1)
	require.NoError(t, err)

	feed2 := store.CreateFeedParams{Uuid: "feed-2", Url: "http://example.com/feed2"}
	_, err = q.CreateFeed(ctx, feed2)
	require.NoError(t, err)

	now := time.Now()
	
	// Create Items
	items := []store.CreateItemParams{
		{ID: "item-1", Url: "u1", Title: stringPtr("Item 1"), PublishedAt: stringPtr(now.Add(-1 * time.Hour).Format(time.RFC3339))},
		{ID: "item-2", Url: "u2", Title: stringPtr("Item 2"), PublishedAt: stringPtr(now.Add(-2 * time.Hour).Format(time.RFC3339))},
		{ID: "item-3", Url: "u3", Title: stringPtr("Item 3"), PublishedAt: stringPtr(now.Add(-3 * time.Hour).Format(time.RFC3339))},
	}

	for _, p := range items {
		_, err := q.CreateItem(ctx, p)
		require.NoError(t, err)
	}

	// Link Items to Feeds
	// Feed 1: Item 1, Item 3
	// Feed 2: Item 2
	require.NoError(t, q.CreateFeedItem(ctx, store.CreateFeedItemParams{FeedID: "feed-1", ItemID: "item-1"}))
	require.NoError(t, q.CreateFeedItem(ctx, store.CreateFeedItemParams{FeedID: "feed-1", ItemID: "item-3"}))
	require.NoError(t, q.CreateFeedItem(ctx, store.CreateFeedItemParams{FeedID: "feed-2", ItemID: "item-2"}))

	t.Run("GetItem", func(t *testing.T) {
		item, err := q.GetItem(ctx, "item-1")
		require.NoError(t, err)
		assert.Equal(t, "item-1", item.ID)
		assert.Equal(t, "feed-1", item.FeedID)
		assert.Equal(t, int64(0), item.IsRead) // Default unread
	})

	t.Run("MarkItemRead", func(t *testing.T) {
		_, err := q.MarkItemRead(ctx, "item-1")
		require.NoError(t, err)

		item, err := q.GetItem(ctx, "item-1")
		require.NoError(t, err)
		assert.Equal(t, int64(1), item.IsRead)
	})

	t.Run("ListGlobalItems", func(t *testing.T) {
		// Should return all items ordered by published_at DESC (Item 1, Item 2, Item 3)
		list, err := q.ListGlobalItems(ctx, store.ListGlobalItemsParams{
			Limit:        10,
			FilterUnread: 0,
		})
		require.NoError(t, err)
		assert.Len(t, list, 3)
		assert.Equal(t, "item-1", list[0].ID)
		assert.Equal(t, "item-2", list[1].ID)
		assert.Equal(t, "item-3", list[2].ID)

		// Test Pagination (Limit 1)
		list, err = q.ListGlobalItems(ctx, store.ListGlobalItemsParams{
			Limit:        1,
			FilterUnread: 0,
		})
		require.NoError(t, err)
		assert.Len(t, list, 1)
		assert.Equal(t, "item-1", list[0].ID)

		// Test Filter Unread
		// Item 1 is Read, Items 2 & 3 are Unread
		list, err = q.ListGlobalItems(ctx, store.ListGlobalItemsParams{
			Limit:        10,
			FilterUnread: 1, // Filter unread
		})
		require.NoError(t, err)
		assert.Len(t, list, 2)
		assert.Equal(t, "item-2", list[0].ID)
		assert.Equal(t, "item-3", list[1].ID)
	})

	t.Run("ListFeedItems", func(t *testing.T) {
		// Feed 1 has Item 1 (Read) and Item 3 (Unread)
		list, err := q.ListFeedItems(ctx, store.ListFeedItemsParams{
			FeedID:       "feed-1",
			Limit:        10,
			FilterUnread: 0,
		})
		require.NoError(t, err)
		assert.Len(t, list, 2)
		assert.Equal(t, "item-1", list[0].ID)
		assert.Equal(t, "item-3", list[1].ID)

		// Filter Unread for Feed 1
		list, err = q.ListFeedItems(ctx, store.ListFeedItemsParams{
			FeedID:       "feed-1",
			Limit:        10,
			FilterUnread: 1,
		})
		require.NoError(t, err)
		assert.Len(t, list, 1)
		assert.Equal(t, "item-3", list[0].ID)
	})
}
