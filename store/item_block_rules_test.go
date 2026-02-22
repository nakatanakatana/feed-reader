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
}
