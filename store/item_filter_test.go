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

func TestStore_ListItems_DateFilter(t *testing.T) {
	s := setupStore(t)
	ctx := context.Background()

	// 1. Setup Data: Create Feed
	feedID := uuid.NewString()
	feedTitle := "Date Filter Feed"
	_, err := s.CreateFeed(ctx, store.CreateFeedParams{
		ID:    feedID,
		Url:   "http://example.com/date-filter.xml",
		Title: &feedTitle,
	})
	require.NoError(t, err)

	// Create items with different dates
	now := time.Now().UTC()
	tOld := now.Add(-48 * time.Hour).Format(time.RFC3339) // 2 days ago
	tMid := now.Add(-12 * time.Hour).Format(time.RFC3339) // 12 hours ago
	tNew := now.Add(-1 * time.Hour).Format(time.RFC3339)  // 1 hour ago

	_ = createTestItem(t, s, ctx, feedID, "http://example.com/old", "Old Item", tOld)
	_ = createTestItem(t, s, ctx, feedID, "http://example.com/mid", "Mid Item", tMid)
	_ = createTestItem(t, s, ctx, feedID, "http://example.com/new", "New Item", tNew)

	t.Run("Filter by 24h", func(t *testing.T) {
		since := now.Add(-24 * time.Hour).Format(time.RFC3339)
		items, err := s.ListItems(ctx, store.ListItemsParams{
			PublishedSince: &since,
			Limit:          10,
			Offset:         0,
		})
		require.NoError(t, err)
		assert.Len(t, items, 2)
		// Should include Mid and New, ordered by date asc (Oldest of the two first)
		assert.Equal(t, "Mid Item", *items[0].Title)
		assert.Equal(t, "New Item", *items[1].Title)
	})

	t.Run("Filter by 1h", func(t *testing.T) {
		since := now.Add(-2 * time.Hour).Format(time.RFC3339)
		items, err := s.ListItems(ctx, store.ListItemsParams{
			PublishedSince: &since,
			Limit:          10,
			Offset:         0,
		})
		require.NoError(t, err)
		assert.Len(t, items, 1)
		assert.Equal(t, "New Item", *items[0].Title)
	})

	t.Run("All Time", func(t *testing.T) {
		items, err := s.ListItems(ctx, store.ListItemsParams{
			PublishedSince: nil,
			Limit:          10,
			Offset:         0,
		})
		require.NoError(t, err)
		assert.Len(t, items, 3)
	})

    t.Run("Count with Filter", func(t *testing.T) {
		since := now.Add(-24 * time.Hour).Format(time.RFC3339)
        count, err := s.CountItems(ctx, store.CountItemsParams{
            PublishedSince: &since,
        })
        require.NoError(t, err)
        assert.Equal(t, int64(2), count)
    })
}
