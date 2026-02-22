package store_test

import (
	"context"
	"testing"

	"github.com/google/uuid"
	"github.com/nakatanakatana/feed-reader/store"
	"gotest.tools/v3/assert"
)

func TestItemBlockRules(t *testing.T) {
	s := setupStore(t)
	ctx := context.Background()

	// 1. Add rules (bulk)
	rule1 := store.CreateItemBlockRuleParams{
		ID:        uuid.NewString(),
		RuleType:  "user",
		RuleValue: "user1",
	}
	rule2 := store.CreateItemBlockRuleParams{
		ID:        uuid.NewString(),
		RuleType:  "domain",
		RuleValue: "example.com",
	}

	err := s.CreateItemBlockRules(ctx, []store.CreateItemBlockRuleParams{rule1, rule2})
	assert.NilError(t, err)

	// 2. List rules
	rules, err := s.ListItemBlockRules(ctx)
	assert.NilError(t, err)
	assert.Assert(t, len(rules) >= 2)

	// 3. Delete rule
	err = s.DeleteItemBlockRule(ctx, rule1.ID)
	assert.NilError(t, err)

	// 4. Verify deletion
	rules, err = s.ListItemBlockRules(ctx)
	assert.NilError(t, err)
	found := false
	for _, r := range rules {
		if r.ID == rule1.ID {
			found = true
			break
		}
	}
	assert.Assert(t, !found)
}

func TestItemBlocks(t *testing.T) {
	s := setupStore(t)
	ctx := context.Background()

	// Setup Feed and Item
	feedID := uuid.NewString()
	_, _ = s.CreateFeed(ctx, store.CreateFeedParams{ID: feedID, Url: "http://example.com/feed"})
	itemID := uuid.NewString()
	_, _ = s.CreateItem(ctx, store.CreateItemParams{ID: itemID, Url: "http://example.com/item"})
	_ = s.CreateFeedItem(ctx, store.CreateFeedItemParams{FeedID: feedID, ItemID: itemID})

	// Setup Rule
	ruleID := uuid.NewString()
	_ = s.CreateItemBlockRules(ctx, []store.CreateItemBlockRuleParams{{
		ID:        ruleID,
		RuleType:  "keyword",
		RuleValue: "badword",
	}})

	// 1. Create block association
	err := s.CreateItemBlock(ctx, store.CreateItemBlockParams{
		ItemID: itemID,
		RuleID: ruleID,
	})
	assert.NilError(t, err)

	// 2. List item blocks (querying store directly or via custom query if needed)
	// For now, let's just check if it exists in the table
	var count int
	err = s.DB.QueryRowContext(ctx, "SELECT count(*) FROM item_blocks WHERE item_id = ? AND rule_id = ?", itemID, ruleID).Scan(&count)
	assert.NilError(t, err)
	assert.Equal(t, count, 1)

	// 3. Verify filtering in ListItems
	t.Run("Filtering in ListItems", func(t *testing.T) {
		// Non-blocked item
		_, _ = s.CreateItem(ctx, store.CreateItemParams{ID: "non-blocked", Url: "http://example.com/ok"})
		_ = s.CreateFeedItem(ctx, store.CreateFeedItemParams{FeedID: feedID, ItemID: "non-blocked"})

		// List blocked (is_blocked = true)
		blockedItems, err := s.ListItems(ctx, store.StoreListItemsParams{IsBlocked: true, Limit: 10})
		assert.NilError(t, err)
		assert.Assert(t, len(blockedItems) >= 1)
		found := false
		for _, item := range blockedItems {
			if item.ID == itemID {
				found = true
				break
			}
		}
		assert.Assert(t, found)

		// List non-blocked (is_blocked = false)
		nonBlockedItems, err := s.ListItems(ctx, store.StoreListItemsParams{IsBlocked: false, Limit: 10})
		assert.NilError(t, err)
		for _, item := range nonBlockedItems {
			assert.Assert(t, item.ID != itemID)
		}
	})
}

func TestStore_PopulateItemBlocksForRule(t *testing.T) {
	s := setupStore(t)
	ctx := context.Background()

	// 1. Setup Items
	item1 := store.SaveFetchedItemParams{
		FeedID: "f1",
		Url:    "https://user1.example.com/post1",
		Title:  func() *string { s := "Bad keyword here"; return &s }(),
	}
	item2 := store.SaveFetchedItemParams{
		FeedID: "f1",
		Url:    "https://user2.example.com/post2",
		Title:  func() *string { s := "Good post"; return &s }(),
	}
	_, _ = s.CreateFeed(ctx, store.CreateFeedParams{ID: "f1", Url: "u1"})
	_ = s.SaveFetchedItem(ctx, item1)
	_ = s.SaveFetchedItem(ctx, item2)

	var id1, id2 string
	_ = s.DB.QueryRow("SELECT id FROM items WHERE url = ?", item1.Url).Scan(&id1)
	_ = s.DB.QueryRow("SELECT id FROM items WHERE url = ?", item2.Url).Scan(&id2)

	// 2. Extracted Info Map
	extractedInfo := map[string]store.ExtractedUserInfo{
		item1.Url: {User: "user1", Domain: "example.com"},
		item2.Url: {User: "user2", Domain: "example.com"},
	}

	t.Run("Keyword Rule", func(t *testing.T) {
		rule := store.ItemBlockRule{
			ID:        uuid.NewString(),
			RuleType:  "keyword",
			RuleValue: "keyword",
		}
		err := s.PopulateItemBlocksForRule(ctx, rule, extractedInfo)
		assert.NilError(t, err)

		var count int
		_ = s.DB.QueryRow("SELECT count(*) FROM item_blocks WHERE rule_id = ?", rule.ID).Scan(&count)
		assert.Equal(t, count, 1)
	})

	t.Run("User Rule", func(t *testing.T) {
		rule := store.ItemBlockRule{
			ID:        uuid.NewString(),
			RuleType:  "user",
			RuleValue: "user1",
		}
		err := s.PopulateItemBlocksForRule(ctx, rule, extractedInfo)
		assert.NilError(t, err)

		var count int
		_ = s.DB.QueryRow("SELECT count(*) FROM item_blocks WHERE rule_id = ?", rule.ID).Scan(&count)
		assert.Equal(t, count, 1)
	})
}
