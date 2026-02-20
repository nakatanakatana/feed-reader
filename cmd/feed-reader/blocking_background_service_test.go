package main

import (
	"context"
	"fmt"
	"log/slog"
	"os"
	"testing"

	"github.com/nakatanakatana/feed-reader/store"
	"gotest.tools/v3/assert"
)

func TestBlockingBackgroundService(t *testing.T) {
	ctx := context.Background()
	queries, db := setupTestDB(t)
	s := store.NewStore(db)
	logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))

	// 1. Setup items
	// Item 1: legit
	// Item 2: will be blocked by domain
	// Item 3: will be blocked by keyword
	_, _ = queries.CreateItem(ctx, store.CreateItemParams{
		ID:  "item-1",
		Url: "https://legit.com/1",
	})
	_, _ = queries.CreateItem(ctx, store.CreateItemParams{
		ID:  "item-2",
		Url: "https://spam.com/2",
	})
	_, _ = queries.CreateItem(ctx, store.CreateItemParams{
		ID:    "item-3",
		Url:   "https://legit.com/3",
		Title: ptr("Contains BADWORD"),
	})

	// 2. Setup rules (after items already created)
	_, _ = queries.CreateBlockingRule(ctx, store.CreateBlockingRuleParams{
		ID:       "rule-1",
		RuleType: "user_domain",
		Domain:   ptr("spam.com"),
	})
	_, _ = queries.CreateBlockingRule(ctx, store.CreateBlockingRuleParams{
		ID:       "rule-2",
		RuleType: "keyword",
		Keyword:  ptr("badword"),
	})

	// 3. Create service and run re-evaluation
	bs := NewBlockingService()
	ue := NewUsernameExtractor()
	service := NewBlockingBackgroundService(s, bs, ue, logger)
	
	err := service.ReevaluateAll(ctx)
	assert.NilError(t, err)

	// 4. Verify results
	allItems, _ := queries.ListAllItems(ctx)
	for _, it := range allItems {
		switch it.ID {
		case "item-1":
			assert.Equal(t, it.IsHidden, int64(0))
		case "item-2":
			assert.Equal(t, it.IsHidden, int64(1))
		case "item-3":
			assert.Equal(t, it.IsHidden, int64(1))
		}
	}

	t.Run("Rule removal restores items", func(t *testing.T) {
		// Remove rule-1 (spam.com)
		_ = queries.DeleteBlockingRule(ctx, "rule-1")
		
		err := service.ReevaluateAll(ctx)
		assert.NilError(t, err)

		// Since item-2 doesn't have a feed_item entry, GetItem will fail as discovered earlier.
		// Use ListAllItems instead.
		items, _ := queries.ListAllItems(ctx)
		for _, it := range items {
			if it.ID == "item-2" {
				assert.Equal(t, it.IsHidden, int64(0), "Item 2 should be restored (is_hidden=0)")
			}
		}
	})

	t.Run("Batch processing with many items", func(t *testing.T) {
		// Create 150 items (more than batchSize=100)
		for i := 0; i < 150; i++ {
			_, _ = queries.CreateItem(ctx, store.CreateItemParams{
				ID:  fmt.Sprintf("batch-item-%03d", i),
				Url: fmt.Sprintf("https://batch.com/%03d", i),
			})
		}

		// Add rule for batch.com
		_, _ = queries.CreateBlockingRule(ctx, store.CreateBlockingRuleParams{
			ID:       "rule-batch",
			RuleType: "user_domain",
			Domain:   ptr("batch.com"),
		})

		err := service.ReevaluateAll(ctx)
		assert.NilError(t, err)

		items, _ := queries.ListAllItems(ctx)
		count := 0
		for _, it := range items {
			if it.IsHidden == 1 {
				count++
			}
		}
		// item-3 (keyword) + 150 batch items = 151
		assert.Equal(t, count, 151)
	})
}
