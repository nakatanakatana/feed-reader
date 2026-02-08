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

	idOld := createTestItem(t, s, ctx, feedID, "http://example.com/old", "Old Item", tOld)
	_, err = s.DB.ExecContext(ctx, "UPDATE items SET created_at = ? WHERE id = ?", tOld, idOld)
	require.NoError(t, err)

	idMid := createTestItem(t, s, ctx, feedID, "http://example.com/mid", "Mid Item", tMid)
	_, err = s.DB.ExecContext(ctx, "UPDATE items SET created_at = ? WHERE id = ?", tMid, idMid)
	require.NoError(t, err)

	idNew := createTestItem(t, s, ctx, feedID, "http://example.com/new", "New Item", tNew)
	_, err = s.DB.ExecContext(ctx, "UPDATE items SET created_at = ? WHERE id = ?", tNew, idNew)
	require.NoError(t, err)

	t.Run("Filter by 24h", func(t *testing.T) {
		since := now.Add(-24 * time.Hour).Format(time.RFC3339)
		items, err := s.ListItems(ctx, store.ListItemsParams{
			Since:  &since,
			Limit:  10,
			Offset: 0,
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
			Since:  &since,
			Limit:  10,
			Offset: 0,
		})
		require.NoError(t, err)
		assert.Len(t, items, 1)
		assert.Equal(t, "New Item", *items[0].Title)
	})

	t.Run("All Time", func(t *testing.T) {
		items, err := s.ListItems(ctx, store.ListItemsParams{
			Since:  nil,
			Limit:  10,
			Offset: 0,
		})
		require.NoError(t, err)
		assert.Len(t, items, 3)
	})

	t.Run("Count with Filter", func(t *testing.T) {
		since := now.Add(-24 * time.Hour).Format(time.RFC3339)
		count, err := s.CountItems(ctx, store.CountItemsParams{
			Since: &since,
		})
		require.NoError(t, err)
		assert.Equal(t, int64(2), count)
	})
}

func TestStore_ListItems_DateFilter_Monotonic_PBT(t *testing.T) {
	s := setupStore(t)
	ctx := context.Background()

	feedID := uuid.NewString()
	_, err := s.CreateFeed(ctx, store.CreateFeedParams{
		ID:  feedID,
		Url: "http://example.com/date-filter-pbt.xml",
	})
	require.NoError(t, err)

	now := time.Now().UTC().Truncate(time.Second)
	itemCount := 25
	for i := 0; i < itemCount; i++ {
		pubAt := now.Add(-time.Duration(i) * time.Hour).Format(time.RFC3339)
		_ = createTestItem(
			t,
			s,
			ctx,
			feedID,
			"http://example.com/pbt/"+uuid.NewString(),
			"PBT Item",
			pubAt,
		)
	}

	maxHours := int64(itemCount + 4)
	rapid.Check(t, func(t *rapid.T) {
		offsetA := rapid.Int64Range(0, maxHours).Draw(t, "offsetA")
		offsetB := rapid.Int64Range(0, maxHours).Draw(t, "offsetB")
		if offsetA < offsetB {
			offsetA, offsetB = offsetB, offsetA
		}

		sinceA := now.Add(-time.Duration(offsetA) * time.Hour).Format(time.RFC3339)
		sinceB := now.Add(-time.Duration(offsetB) * time.Hour).Format(time.RFC3339)

		itemsA, err := s.ListItems(ctx, store.ListItemsParams{
			Since:  &sinceA,
			Limit:  100,
			Offset: 0,
		})
		require.NoError(t, err)
		itemsB, err := s.ListItems(ctx, store.ListItemsParams{
			Since:  &sinceB,
			Limit:  100,
			Offset: 0,
		})
		require.NoError(t, err)

		if len(itemsA) < len(itemsB) {
			t.Fatalf("expected monotonic filter: len(itemsA)=%d len(itemsB)=%d", len(itemsA), len(itemsB))
		}
	})
}

func TestStore_ListItems_CountMatches_List_PBT(t *testing.T) {
	s := setupStore(t)
	ctx := context.Background()

	feedID := uuid.NewString()
	_, err := s.CreateFeed(ctx, store.CreateFeedParams{
		ID:  feedID,
		Url: "http://example.com/date-filter-count-pbt.xml",
	})
	require.NoError(t, err)

	now := time.Now().UTC().Truncate(time.Second)
	itemCount := 30
	for i := 0; i < itemCount; i++ {
		pubAt := now.Add(-time.Duration(i) * time.Hour).Format(time.RFC3339)
		_ = createTestItem(
			t,
			s,
			ctx,
			feedID,
			"http://example.com/pbt-count/"+uuid.NewString(),
			"PBT Count Item",
			pubAt,
		)
	}

	maxHours := int64(itemCount + 4)
	rapid.Check(t, func(t *rapid.T) {
		offset := rapid.Int64Range(0, maxHours).Draw(t, "offset")
		since := now.Add(-time.Duration(offset) * time.Hour).Format(time.RFC3339)

		items, err := s.ListItems(ctx, store.ListItemsParams{
			Since:  &since,
			Limit:  100,
			Offset: 0,
		})
		require.NoError(t, err)

		count, err := s.CountItems(ctx, store.CountItemsParams{
			Since: &since,
		})
		require.NoError(t, err)

		if int64(len(items)) != count {
			t.Fatalf("expected count to match list length: len(items)=%d count=%d", len(items), count)
		}
	})
}
