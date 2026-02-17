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
	assert.NilError(t, err)

	// Create items with different dates
	now := time.Now().UTC()
	tOld := now.Add(-48 * time.Hour).Format(time.RFC3339) // 2 days ago
	tMid := now.Add(-12 * time.Hour).Format(time.RFC3339) // 12 hours ago
	tNew := now.Add(-1 * time.Hour).Format(time.RFC3339)  // 1 hour ago

	idOld := createTestItem(t, s, ctx, feedID, "http://example.com/old", "Old Item", tOld)
	_, err = s.DB.ExecContext(ctx, "UPDATE items SET created_at = ? WHERE id = ?", tOld, idOld)
	assert.NilError(t, err)

	idMid := createTestItem(t, s, ctx, feedID, "http://example.com/mid", "Mid Item", tMid)
	_, err = s.DB.ExecContext(ctx, "UPDATE items SET created_at = ? WHERE id = ?", tMid, idMid)
	assert.NilError(t, err)

	idNew := createTestItem(t, s, ctx, feedID, "http://example.com/new", "New Item", tNew)
	_, err = s.DB.ExecContext(ctx, "UPDATE items SET created_at = ? WHERE id = ?", tNew, idNew)
	assert.NilError(t, err)

	t.Run("Filter by 24h", func(t *testing.T) {
		since := now.Add(-24 * time.Hour).Format(time.RFC3339)
		items, err := s.ListItems(ctx, store.ListItemsParams{
			Since:  &since,
			Limit:  10,
			Offset: 0,
		})
		assert.NilError(t, err)
		assert.Assert(t, cmp.Len(items, 2))
		// Should include Mid and New, ordered by date asc (Oldest of the two first)
		assert.Equal(t, *items[0].Title, "Mid Item")
		assert.Equal(t, *items[1].Title, "New Item")
	})

	t.Run("Filter by 1h", func(t *testing.T) {
		since := now.Add(-2 * time.Hour).Format(time.RFC3339)
		items, err := s.ListItems(ctx, store.ListItemsParams{
			Since:  &since,
			Limit:  10,
			Offset: 0,
		})
		assert.NilError(t, err)
		assert.Assert(t, cmp.Len(items, 1))
		assert.Equal(t, *items[0].Title, "New Item")
	})

	t.Run("All Time", func(t *testing.T) {
		items, err := s.ListItems(ctx, store.ListItemsParams{
			Since:  nil,
			Limit:  10,
			Offset: 0,
		})
		assert.NilError(t, err)
		assert.Assert(t, cmp.Len(items, 3))
	})

	t.Run("Count with Filter", func(t *testing.T) {
		since := now.Add(-24 * time.Hour).Format(time.RFC3339)
		count, err := s.CountItems(ctx, store.CountItemsParams{
			Since: &since,
		})
		assert.NilError(t, err)
		assert.Equal(t, count, int64(2))
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
	assert.NilError(t, err)

	now := time.Now().UTC().Truncate(time.Second)
	itemCount := 25
	for i := range itemCount {
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
		assert.NilError(t, err)
		itemsB, err := s.ListItems(ctx, store.ListItemsParams{
			Since:  &sinceB,
			Limit:  100,
			Offset: 0,
		})
		assert.NilError(t, err)

		assert.Assert(t, len(itemsA) >= len(itemsB), "expected monotonic filter: len(itemsA)=%d len(itemsB)=%d", len(itemsA), len(itemsB))
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
	assert.NilError(t, err)

	now := time.Now().UTC().Truncate(time.Second)
	itemCount := 30
	for i := range itemCount {
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
		assert.NilError(t, err)

		count, err := s.CountItems(ctx, store.CountItemsParams{
			Since: &since,
		})
		assert.NilError(t, err)

		assert.Equal(t, int64(len(items)), count)
	})
}
