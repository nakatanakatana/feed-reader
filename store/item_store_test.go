package store_test

import (
	"context"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/nakatanakatana/feed-reader/store"
	"gotest.tools/v3/assert"
	"gotest.tools/v3/assert/cmp"
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
	assert.NilError(t, err)

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
	assert.NilError(t, err)

	item2ID := createTestItem(t, s, ctx, feedID, "http://example.com/2", "Item 2", t2)
	_, err = s.DB.ExecContext(ctx, "UPDATE items SET created_at = ? WHERE id = ?", t2, item2ID)
	assert.NilError(t, err)

	item3ID := createTestItem(t, s, ctx, feedID, "http://example.com/3", "Item 3", t3)
	_, err = s.DB.ExecContext(ctx, "UPDATE items SET created_at = ? WHERE id = ?", t3, item3ID)
	assert.NilError(t, err)

	// Set Statuses
	_, err = s.SetItemRead(ctx, store.SetItemReadParams{ItemID: item1ID, IsRead: 1, ReadAt: &t3})
	assert.NilError(t, err)

	// Test GetItem
	t.Run("GetItem", func(t *testing.T) {
		got, err := s.GetItem(ctx, item1ID)
		assert.NilError(t, err)
		assert.Equal(t, got.ID, item1ID)
		assert.Equal(t, got.IsRead, int64(1))
		assert.Equal(t, got.FeedID, feedID)

		got3, err := s.GetItem(ctx, item3ID)
		assert.NilError(t, err)
		assert.Equal(t, got3.IsRead, int64(0))
	})

	// Test ListItems
	t.Run("ListItems", func(t *testing.T) {
		// All items, asc (standardized)
		all, err := s.ListItems(ctx, store.ListItemsParams{Limit: 10, Offset: 0})
		assert.NilError(t, err)
		assert.Assert(t, cmp.Len(all, 3))
		assert.Equal(t, all[0].ID, item1ID) // Oldest first
		assert.Equal(t, all[2].ID, item3ID) // Newest last

		// Filter by IsRead
		reads, err := s.ListItems(ctx, store.ListItemsParams{IsRead: int64(1), Limit: 10})
		assert.NilError(t, err)
		assert.Assert(t, cmp.Len(reads, 1))
		assert.Equal(t, reads[0].ID, item1ID)

		// Filter by Feed (should be all)
		feedItems, err := s.ListItems(ctx, store.ListItemsParams{FeedID: feedID, Limit: 10})
		assert.NilError(t, err)
		assert.Assert(t, cmp.Len(feedItems, 3))
	})

	// Test CountItems
	t.Run("CountItems", func(t *testing.T) {
		count, err := s.CountItems(ctx, store.CountItemsParams{})
		assert.NilError(t, err)
		assert.Equal(t, count, int64(3))
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
		assert.NilError(t, err)

		count := rapid.IntRange(5, 20).Draw(t, "count")
		itemIDs := make([]string, 0, count)
		for i := range count {
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
				assert.NilError(t, err)
			}
		}

		items, err := s.ListItems(ctx, store.ListItemsParams{IsRead: int64(1), Limit: 100})
		assert.NilError(t, err)

		counted, err := s.CountItems(ctx, store.CountItemsParams{IsRead: int64(1)})
		assert.NilError(t, err)

		assert.Equal(t, len(items), readCount)
		assert.Equal(t, counted, int64(readCount))
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
	err := s.SaveFetchedItem(ctx, params)
	assert.NilError(t, err)

	var id string
	err = s.DB.QueryRowContext(ctx, "SELECT id FROM items WHERE url = ?", url).Scan(&id)
	assert.NilError(t, err)
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
	assert.NilError(t, err)

	// Get ID
	var id string
	err = s.DB.QueryRowContext(ctx, "SELECT id FROM items WHERE url = ?", url).Scan(&id)
	assert.NilError(t, err)
	return id
}
