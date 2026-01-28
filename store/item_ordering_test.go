package store_test

import (
	"context"
	"testing"

	"github.com/google/uuid"
	"github.com/nakatanakatana/feed-reader/store"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestStore_ItemOrdering(t *testing.T) {
	s := setupStore(t)
	ctx := context.Background()

	// Setup Feed
	feedID := uuid.NewString()
	feedTitle := "Ordering Test Feed"
	_, err := s.CreateFeed(ctx, store.CreateFeedParams{
		ID:    feedID,
		Url:   "http://ordering.example.com/feed.xml",
		Title: &feedTitle,
	})
	require.NoError(t, err)

	/*
		Target Order (ASC):
		1. Item A: Published 2026-01-01
		2. Item B: Published 2026-01-02
		3. Item C: Published NULL, Created 2026-01-03 (fallback)
		4. Item D: Published NULL, Created 2026-01-04 (fallback)
	*/

	createItemWithDates := func(id, url, title string, pubAt *string, createdAt string) {
		_, err := s.CreateItem(ctx, store.CreateItemParams{
			ID:          id,
			Url:         url,
			Title:       &title,
			PublishedAt: pubAt,
		})
		require.NoError(t, err)

		err = s.CreateFeedItem(ctx, store.CreateFeedItemParams{
			FeedID: feedID,
			ItemID: id,
		})
		require.NoError(t, err)

		// Manually update created_at to control ordering in test
		_, err = s.DB.ExecContext(ctx, "UPDATE items SET created_at = ? WHERE id = ?", createdAt, id)
		require.NoError(t, err)
	}

	p1 := "2026-01-01T00:00:00Z"
	p2 := "2026-01-02T00:00:00Z"
	c3 := "2026-01-03T00:00:00Z"
	c4 := "2026-01-04T00:00:00Z"

	itemA := uuid.NewString()
	itemB := uuid.NewString()
	itemC := uuid.NewString()
	itemD := uuid.NewString()

	createItemWithDates(itemA, "http://ex.com/a", "Item A", &p1, "2026-01-28T00:00:00Z")
	createItemWithDates(itemB, "http://ex.com/b", "Item B", &p2, "2026-01-28T00:00:01Z")
	createItemWithDates(itemC, "http://ex.com/c", "Item C", nil, c3)
	createItemWithDates(itemD, "http://ex.com/d", "Item D", nil, c4)

	t.Run("ListItemsAsc should sort by COALESCE(published_at, created_at) ASC", func(t *testing.T) {
		items, err := s.ListItemsAsc(ctx, store.ListItemsAscParams{Limit: 10})
		require.NoError(t, err)
		require.Len(t, items, 4)

		assert.Equal(t, itemA, items[0].ID, "Item A should be first (Oldest Published)")
		assert.Equal(t, itemB, items[1].ID, "Item B should be second")
		assert.Equal(t, itemC, items[2].ID, "Item C should be third (Fallback to Created)")
		assert.Equal(t, itemD, items[3].ID, "Item D should be fourth (Fallback to Created)")
	})

	t.Run("ListItems should also sort by COALESCE(published_at, created_at) ASC", func(t *testing.T) {
		// Based on spec: "Update the item listing queries to sort items in ascending order (oldest first)"
		items, err := s.ListItems(ctx, store.ListItemsParams{Limit: 10})
		require.NoError(t, err)
		require.Len(t, items, 4)

		assert.Equal(t, itemA, items[0].ID)
		assert.Equal(t, itemB, items[1].ID)
		assert.Equal(t, itemC, items[2].ID)
		assert.Equal(t, itemD, items[3].ID)
	})

	t.Run("ListItemsByFeed should also sort by COALESCE(published_at, created_at) ASC", func(t *testing.T) {
		items, err := s.ListItemsByFeed(ctx, feedID)
		require.NoError(t, err)
		require.Len(t, items, 4)

		assert.Equal(t, itemA, items[0].ID)
		assert.Equal(t, itemB, items[1].ID)
		assert.Equal(t, itemC, items[2].ID)
		assert.Equal(t, itemD, items[3].ID)
	})
}
