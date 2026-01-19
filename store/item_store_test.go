package store_test

import (
	"context"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/nakatanakatana/feed-reader/store"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestStore_ItemOperations(t *testing.T) {
	s := setupStore(t)
	ctx := context.Background()

	// 1. Setup Data: Create Feed
	feedID := uuid.NewString()
	feedTitle := "My Feed"
	feedParams := store.CreateFeedParams{
		Uuid:  feedID,
		Url:   "http://example.com/feed.xml",
		Title: &feedTitle,
	}
	_, err := s.CreateFeed(ctx, feedParams)
	require.NoError(t, err)

	// Create 3 items
	// Item 1: Read, Saved, Oldest
	// Item 2: Unread, Saved, Middle
	// Item 3: Unread, Unsaved, Newest

	now := time.Now()
	t1 := now.Add(-2 * time.Hour).Format(time.RFC3339)
	t2 := now.Add(-1 * time.Hour).Format(time.RFC3339)
	t3 := now.Format(time.RFC3339)

	item1ID := createTestItem(t, s, ctx, feedID, "http://example.com/1", "Item 1", t1)
	item2ID := createTestItem(t, s, ctx, feedID, "http://example.com/2", "Item 2", t2)
	item3ID := createTestItem(t, s, ctx, feedID, "http://example.com/3", "Item 3", t3)

	// Set Statuses
	_, err = s.SetItemRead(ctx, store.SetItemReadParams{ItemID: item1ID, IsRead: 1, ReadAt: &t3})
	require.NoError(t, err)
	_, err = s.SetItemSaved(ctx, store.SetItemSavedParams{ItemID: item1ID, IsSaved: 1, SavedAt: &t3})
	require.NoError(t, err)

	_, err = s.SetItemSaved(ctx, store.SetItemSavedParams{ItemID: item2ID, IsSaved: 1, SavedAt: &t3})
	require.NoError(t, err)

	// Test GetItem
	t.Run("GetItem", func(t *testing.T) {
		got, err := s.GetItem(ctx, item1ID)
		require.NoError(t, err)
		assert.Equal(t, item1ID, got.ID)
		assert.Equal(t, int64(1), got.IsRead)
		assert.Equal(t, int64(1), got.IsSaved)
		assert.Equal(t, feedID, got.FeedID)

		got3, err := s.GetItem(ctx, item3ID)
		require.NoError(t, err)
		assert.Equal(t, int64(0), got3.IsRead)
		assert.Equal(t, int64(0), got3.IsSaved)
	})

	// Test ListItems
	t.Run("ListItems", func(t *testing.T) {
		// All items, desc (default)
		all, err := s.ListItems(ctx, store.ListItemsParams{Limit: 10, Offset: 0})
		require.NoError(t, err)
		assert.Len(t, all, 3)
		assert.Equal(t, item3ID, all[0].ID) // Newest first
		assert.Equal(t, item1ID, all[2].ID) // Oldest last

		// Filter by IsRead
		reads, err := s.ListItems(ctx, store.ListItemsParams{IsRead: int64(1), Limit: 10})
		require.NoError(t, err)
		assert.Len(t, reads, 1)
		assert.Equal(t, item1ID, reads[0].ID)

		// Filter by IsSaved
		saves, err := s.ListItems(ctx, store.ListItemsParams{IsSaved: int64(1), Limit: 10})
		require.NoError(t, err)
		assert.Len(t, saves, 2) // Item 1 and 2

		// Filter by Feed (should be all)
		feedItems, err := s.ListItems(ctx, store.ListItemsParams{FeedID: feedID, Limit: 10})
		require.NoError(t, err)
		assert.Len(t, feedItems, 3)
	})

	// Test ListItemsAsc
	t.Run("ListItemsAsc", func(t *testing.T) {
		all, err := s.ListItemsAsc(ctx, store.ListItemsAscParams{Limit: 10, Offset: 0})
		require.NoError(t, err)
		assert.Len(t, all, 3)
		assert.Equal(t, item1ID, all[0].ID) // Oldest first
		assert.Equal(t, item3ID, all[2].ID) // Newest last
	})

	// Test CountItems
	t.Run("CountItems", func(t *testing.T) {
		count, err := s.CountItems(ctx, store.CountItemsParams{})
		require.NoError(t, err)
		assert.Equal(t, int64(3), count)

		savedCount, err := s.CountItems(ctx, store.CountItemsParams{IsSaved: int64(1)})
		require.NoError(t, err)
		assert.Equal(t, int64(2), savedCount)
	})
}

func createTestItem(t *testing.T, s *store.Store, ctx context.Context, feedID, url, title, pubAt string) string {
	desc := "desc"
	guid := uuid.NewString()
	params := store.SaveFetchedItemParams{
		FeedID:      feedID,
		Url:         url,
		Title:       &title,
		Description: &desc,
		PublishedAt: &pubAt,
		Guid:        &guid,
	}
	err := s.SaveFetchedItem(ctx, params)
	require.NoError(t, err)

	// Get ID
	var id string
	err = s.DB.QueryRowContext(ctx, "SELECT id FROM items WHERE url = ?", url).Scan(&id)
	require.NoError(t, err)
	return id
}
