package store_test

import (
	"context"
	"testing"

	"github.com/google/uuid"
	"github.com/nakatanakatana/feed-reader/store"
	"gotest.tools/v3/assert"
	"gotest.tools/v3/assert/cmp"
)

func TestStore_ListItems_BlockFiltering(t *testing.T) {
	s := setupStore(t)
	ctx := context.Background()

	feedID := uuid.NewString()
	_, err := s.CreateFeed(ctx, store.CreateFeedParams{
		ID:  feedID,
		Url: "http://example.com/block-test.xml",
	})
	assert.NilError(t, err)

	// Create 3 items
	_ = createTestItem(t, s, ctx, feedID, "http://example.com/1", "Item 1", "2026-02-22T10:00:00Z")
	item2ID := createTestItem(t, s, ctx, feedID, "http://example.com/2", "Item 2", "2026-02-22T11:00:00Z")
	_ = createTestItem(t, s, ctx, feedID, "http://example.com/3", "Item 3", "2026-02-22T12:00:00Z")

	// Block item 2
	ruleID := uuid.NewString()
	_, err = s.CreateItemBlockRule(ctx, store.CreateItemBlockRuleParams{
		ID:        ruleID,
		RuleType:  "user",
		RuleValue: "testuser",
	})
	assert.NilError(t, err)

	err = s.CreateItemBlock(ctx, store.CreateItemBlockParams{
		ItemID: item2ID,
		RuleID: ruleID,
	})
	assert.NilError(t, err)

	t.Run("ListItems_IsBlocked_False", func(t *testing.T) {
		items, err := s.ListItems(ctx, store.StoreListItemsParams{
			IsBlocked: 0, // 0 for false in SQLite
			Limit:     10,
		})
		assert.NilError(t, err)
		assert.Assert(t, cmp.Len(items, 2))
		for _, item := range items {
			assert.Assert(t, item.ID != item2ID)
		}
	})

	t.Run("ListItems_IsBlocked_True", func(t *testing.T) {
		items, err := s.ListItems(ctx, store.StoreListItemsParams{
			IsBlocked: 1, // 1 for true in SQLite
			Limit:     10,
		})
		assert.NilError(t, err)
		assert.Assert(t, cmp.Len(items, 1))
		assert.Equal(t, items[0].ID, item2ID)
	})

	t.Run("ListItems_IsBlocked_Nil", func(t *testing.T) {
		items, err := s.ListItems(ctx, store.StoreListItemsParams{
			IsBlocked: nil,
			Limit:     10,
		})
		assert.NilError(t, err)
		assert.Assert(t, cmp.Len(items, 3))
	})

	t.Run("CountItems_IsBlocked", func(t *testing.T) {
		countFalse, err := s.CountItems(ctx, store.StoreCountItemsParams{
			IsBlocked: 0,
		})
		assert.NilError(t, err)
		assert.Equal(t, countFalse, int64(2))

		countTrue, err := s.CountItems(ctx, store.StoreCountItemsParams{
			IsBlocked: 1,
		})
		assert.NilError(t, err)
		assert.Equal(t, countTrue, int64(1))

		countAll, err := s.CountItems(ctx, store.StoreCountItemsParams{
			IsBlocked: nil,
		})
		assert.NilError(t, err)
		assert.Equal(t, countAll, int64(3))
	})
}
