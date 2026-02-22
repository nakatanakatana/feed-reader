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
		Domain:    "",
	}
	rule2 := store.CreateItemBlockRuleParams{
		ID:        uuid.NewString(),
		RuleType:  "domain",
		RuleValue: "example.com",
		Domain:    "",
	}

	rules, err := s.CreateItemBlockRules(ctx, []store.CreateItemBlockRuleParams{rule1, rule2})
	assert.NilError(t, err)
	assert.Equal(t, len(rules), 2)
	assert.Equal(t, rules[0].RuleValue, "user1")

	// 2. Test Conflict (ID consistency)
	// When a rule with the same type/value/domain already exists, the store implementation
	// should return the existing rule instead of creating a new one, preserving its ID.
	newID := uuid.NewString()
	conflictRule := store.CreateItemBlockRuleParams{
		ID:        newID,
		RuleType:  "user",
		RuleValue: "user1", // Same type/value
		Domain:    "",      // Same domain
	}
	rules2, err := s.CreateItemBlockRules(ctx, []store.CreateItemBlockRuleParams{conflictRule})
	assert.NilError(t, err)
	assert.Equal(t, len(rules2), 1)
	assert.Equal(t, rules2[0].ID, rule1.ID)
	assert.Assert(t, rules2[0].ID != newID)

	// 3. List rules
	allRules, err := s.ListItemBlockRules(ctx)
	assert.NilError(t, err)
	assert.Assert(t, len(allRules) >= 2)

	// 4. Delete rule
	err = s.DeleteItemBlockRule(ctx, rule1.ID)
	assert.NilError(t, err)

	// 5. Verify deletion
	allRules, err = s.ListItemBlockRules(ctx)
	assert.NilError(t, err)
	found := false
	for _, r := range allRules {
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
	_, _ = s.CreateItemBlockRules(ctx, []store.CreateItemBlockRuleParams{{
		ID:        ruleID,
		RuleType:  "keyword",
		RuleValue: "badword",
		Domain:    "",
	}})

	// 1. Create block association
	err := s.CreateItemBlock(ctx, store.CreateItemBlockParams{
		ItemID: itemID,
		RuleID: ruleID,
	})
	assert.NilError(t, err)

	// 2. List item blocks
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
		blockedItems, err := s.ListItems(ctx, store.StoreListItemsParams{IsBlocked: 1, Limit: 10})
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
		nonBlockedItems, err := s.ListItems(ctx, store.StoreListItemsParams{IsBlocked: 0, Limit: 10})
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
	item1URL := "https://user1.example.com/post1"
	item2URL := "https://user2.example.com/post2"
	item3URL := "https://other-domain.com/post3"

	_, _ = s.CreateFeed(ctx, store.CreateFeedParams{ID: "f1", Url: "u1"})
	_ = s.SaveFetchedItem(ctx, store.SaveFetchedItemParams{
		FeedID: "f1",
		Url:    item1URL,
		Title:  func() *string { s := "Bad keyword here"; return &s }(),
	})
	_ = s.SaveFetchedItem(ctx, store.SaveFetchedItemParams{
		FeedID: "f1",
		Url:    item2URL,
		Title:  func() *string { s := "Good post"; return &s }(),
	})
	_ = s.SaveFetchedItem(ctx, store.SaveFetchedItemParams{
		FeedID: "f1",
		Url:    item3URL,
		Title:  func() *string { s := "Other post"; return &s }(),
	})

	// 2. Extracted Info Map
	extractedInfo := map[string]store.ExtractedUserInfo{
		item1URL: {User: "user1", Domain: "example.com"},
		item2URL: {User: "user2", Domain: "example.com"},
	}

	// 3. Pre-fetch items
	items, err := s.ListItemsForBlocking(ctx)
	assert.NilError(t, err)

	t.Run("Keyword Rule", func(t *testing.T) {
		rules, err := s.CreateItemBlockRules(ctx, []store.CreateItemBlockRuleParams{{
			ID:        uuid.NewString(),
			RuleType:  "keyword",
			RuleValue: "keyword",
			Domain:    "",
		}})
		assert.NilError(t, err)
		rule := rules[0]

		err = s.PopulateItemBlocksForRule(ctx, rule, items, extractedInfo)
		assert.NilError(t, err)

		var count int
		_ = s.DB.QueryRow("SELECT count(*) FROM item_blocks WHERE rule_id = ?", rule.ID).Scan(&count)
		assert.Equal(t, count, 1)
	})

	t.Run("User Rule", func(t *testing.T) {
		rules, err := s.CreateItemBlockRules(ctx, []store.CreateItemBlockRuleParams{{
			ID:        uuid.NewString(),
			RuleType:  "user",
			RuleValue: "user1",
			Domain:    "",
		}})
		assert.NilError(t, err)
		rule := rules[0]

		err = s.PopulateItemBlocksForRule(ctx, rule, items, extractedInfo)
		assert.NilError(t, err)

		var count int
		_ = s.DB.QueryRow("SELECT count(*) FROM item_blocks WHERE rule_id = ?", rule.ID).Scan(&count)
		assert.Equal(t, count, 1)
	})

	t.Run("Domain Rule (Extracted)", func(t *testing.T) {
		rules, err := s.CreateItemBlockRules(ctx, []store.CreateItemBlockRuleParams{{
			ID:        uuid.NewString(),
			RuleType:  "domain",
			RuleValue: "example.com",
			Domain:    "",
		}})
		assert.NilError(t, err)
		rule := rules[0]

		err = s.PopulateItemBlocksForRule(ctx, rule, items, extractedInfo)
		assert.NilError(t, err)

		var count int
		_ = s.DB.QueryRow("SELECT count(*) FROM item_blocks WHERE rule_id = ?", rule.ID).Scan(&count)
		// Should match item1 and item2
		assert.Equal(t, count, 2)
	})

	t.Run("Domain Rule (Fallback)", func(t *testing.T) {
		rules, err := s.CreateItemBlockRules(ctx, []store.CreateItemBlockRuleParams{{
			ID:        uuid.NewString(),
			RuleType:  "domain",
			RuleValue: "other-domain.com",
			Domain:    "",
		}})
		assert.NilError(t, err)
		rule := rules[0]

		// item3URL is not in extractedInfo, should use fallback
		err = s.PopulateItemBlocksForRule(ctx, rule, items, extractedInfo)
		assert.NilError(t, err)

		var count int
		_ = s.DB.QueryRow("SELECT count(*) FROM item_blocks WHERE rule_id = ?", rule.ID).Scan(&count)
		assert.Equal(t, count, 1)
	})

	t.Run("User Domain Rule", func(t *testing.T) {
		domain := "example.com"
		rules, err := s.CreateItemBlockRules(ctx, []store.CreateItemBlockRuleParams{{
			ID:        uuid.NewString(),
			RuleType:  "user_domain",
			RuleValue: "user2",
			Domain:    domain,
		}})
		assert.NilError(t, err)
		rule := rules[0]

		err = s.PopulateItemBlocksForRule(ctx, rule, items, extractedInfo)
		assert.NilError(t, err)

		var count int
		_ = s.DB.QueryRow("SELECT count(*) FROM item_blocks WHERE rule_id = ?", rule.ID).Scan(&count)
		assert.Equal(t, count, 1)
	})
}
