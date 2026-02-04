package store_test

import (
	"context"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/nakatanakatana/feed-reader/store"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"pgregory.net/rapid"
)

func TestStore_ItemOperations(t *testing.T) {
	s := setupStore(t)
	ctx := context.Background()

	// 1. Setup Data: Create Feed
	feedID := uuid.NewString()
	feedTitle := "My Feed"
	feedParams := store.CreateFeedParams{
		ID:    feedID,
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
	// Manually update created_at to ensure sorting order (as test runs fast, created_at might be identical)
	_, err = s.DB.ExecContext(ctx, "UPDATE items SET created_at = ? WHERE id = ?", t1, item1ID)
	require.NoError(t, err)

	item2ID := createTestItem(t, s, ctx, feedID, "http://example.com/2", "Item 2", t2)
	_, err = s.DB.ExecContext(ctx, "UPDATE items SET created_at = ? WHERE id = ?", t2, item2ID)
	require.NoError(t, err)

	item3ID := createTestItem(t, s, ctx, feedID, "http://example.com/3", "Item 3", t3)
	_, err = s.DB.ExecContext(ctx, "UPDATE items SET created_at = ? WHERE id = ?", t3, item3ID)
	require.NoError(t, err)

	// Set Statuses
	_, err = s.SetItemRead(ctx, store.SetItemReadParams{ItemID: item1ID, IsRead: 1, ReadAt: &t3})
	require.NoError(t, err)

	// Test GetItem
	t.Run("GetItem", func(t *testing.T) {
		got, err := s.GetItem(ctx, item1ID)
		require.NoError(t, err)
		assert.Equal(t, item1ID, got.ID)
		assert.Equal(t, int64(1), got.IsRead)
		assert.Equal(t, feedID, got.FeedID)

		got3, err := s.GetItem(ctx, item3ID)
		require.NoError(t, err)
		assert.Equal(t, int64(0), got3.IsRead)
	})

	// Test ListItems
	t.Run("ListItems", func(t *testing.T) {
		// All items, asc (standardized)
		all, err := s.ListItems(ctx, store.ListItemsParams{Limit: 10, Offset: 0})
		require.NoError(t, err)
		assert.Len(t, all, 3)
		assert.Equal(t, item1ID, all[0].ID) // Oldest first
		assert.Equal(t, item3ID, all[2].ID) // Newest last

		// Filter by IsRead
		reads, err := s.ListItems(ctx, store.ListItemsParams{IsRead: int64(1), Limit: 10})
		require.NoError(t, err)
		assert.Len(t, reads, 1)
		assert.Equal(t, item1ID, reads[0].ID)

		// Filter by Feed (should be all)
		feedItems, err := s.ListItems(ctx, store.ListItemsParams{FeedID: feedID, Limit: 10})
		require.NoError(t, err)
		assert.Len(t, feedItems, 3)
	})

	// Test CountItems
	t.Run("CountItems", func(t *testing.T) {
		count, err := s.CountItems(ctx, store.CountItemsParams{})
		require.NoError(t, err)
		assert.Equal(t, int64(3), count)
	})
}

func TestStore_ListItems_IsRead_CountMatches_PBT(t *testing.T) {
	rapid.Check(t, func(t *rapid.T) {
		s := setupStoreForRapid(t)
		ctx := context.Background()
		defer func() {
			_ = s.DB.Close()
		}()

		feedID := uuid.NewString()
		_, err := s.CreateFeed(ctx, store.CreateFeedParams{
			ID:  feedID,
			Url: "http://example.com/read-pbt.xml",
		})
		require.NoError(t, err)

		count := rapid.IntRange(5, 20).Draw(t, "count")
		itemIDs := make([]string, 0, count)
		for i := 0; i < count; i++ {
			pubAt := time.Now().Add(time.Duration(-i) * time.Hour).Format(time.RFC3339)
			id := createTestItemForRapid(
				t,
				s,
				ctx,
				feedID,
				"http://example.com/read-pbt/"+uuid.NewString(),
				"Read PBT Item",
				pubAt,
			)
			itemIDs = append(itemIDs, id)
		}

		readCount := 0
		for _, id := range itemIDs {
			if rapid.Bool().Draw(t, "isRead") {
				readCount++
				_, err := s.SetItemRead(ctx, store.SetItemReadParams{ItemID: id, IsRead: 1})
				require.NoError(t, err)
			}
		}

		items, err := s.ListItems(ctx, store.ListItemsParams{IsRead: int64(1), Limit: 100})
		require.NoError(t, err)

		counted, err := s.CountItems(ctx, store.CountItemsParams{IsRead: int64(1)})
		require.NoError(t, err)

		if len(items) != readCount {
			t.Fatalf("expected read items to match: len(items)=%d readCount=%d", len(items), readCount)
		}
		if int64(readCount) != counted {
			t.Fatalf("expected count to match read items: count=%d readCount=%d", counted, readCount)
		}
	})
}

func createTestItemForRapid(t *rapid.T, s *store.Store, ctx context.Context, feedID, url, title, pubAt string) string {
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
	if err := s.SaveFetchedItem(ctx, params); err != nil {
		t.Fatalf("failed to save item: %v", err)
	}

	var id string
	if err := s.DB.QueryRowContext(ctx, "SELECT id FROM items WHERE url = ?", url).Scan(&id); err != nil {
		t.Fatalf("failed to load item id: %v", err)
	}
	return id
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
