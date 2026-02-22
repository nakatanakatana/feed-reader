package main

import (
	"context"
	"testing"
	"time"

	"connectrpc.com/connect"
	"github.com/nakatanakatana/feed-reader/gen/go/item/v1"
	"github.com/nakatanakatana/feed-reader/store"
	"gotest.tools/v3/assert"
)

func TestItemServer_ItemBlockRules(t *testing.T) {
	ctx := context.Background()
	_, db := setupTestDB(t)
	s := store.NewStore(db)
	server := NewItemServer(s, nil)

	t.Run("AddItemBlockRules", func(t *testing.T) {
		// Pre-setup some items and a URL rule
		_, _ = s.CreateURLParsingRule(ctx, store.CreateURLParsingRuleParams{
			ID:       "u1",
			Domain:   "example.com",
			RuleType: "subdomain",
			Pattern:  "example.com",
		})
		_, _ = s.CreateFeed(ctx, store.CreateFeedParams{ID: "f1", Url: "u1"})
		_ = s.SaveFetchedItem(ctx, store.SaveFetchedItemParams{
			FeedID: "f1",
			Url:    "https://user1.example.com/post1",
			Title:  func() *string { s := "Bad keyword here"; return &s }(),
		})

		req := &itemv1.AddItemBlockRulesRequest{
			Rules: []*itemv1.AddItemBlockRulesRequest_Rule{
				{RuleType: "user", Value: "user1"},
				{RuleType: "keyword", Value: "keyword"},
			},
		}
		_, err := server.AddItemBlockRules(ctx, connect.NewRequest(req))
		assert.NilError(t, err)

		// Wait for background scanning by polling the item_blocks table with a timeout
		waitCtx, cancel := context.WithTimeout(ctx, 5*time.Second)
		defer cancel()

		for {
			select {
			case <-waitCtx.Done():
				t.Fatalf("timed out waiting for item_blocks to be populated")
			default:
			}

			var count int
			err := db.QueryRow("SELECT count(*) FROM item_blocks").Scan(&count)
			assert.NilError(t, err)
			if count >= 1 {
				break
			}

			time.Sleep(50 * time.Millisecond)
		}

		// Verify item_blocks
		var count int
		_ = db.QueryRow("SELECT count(*) FROM item_blocks").Scan(&count)
		assert.Assert(t, count >= 1, "Should have populated item_blocks")
	})

	t.Run("ListItemBlockRules", func(t *testing.T) {
		res, err := server.ListItemBlockRules(ctx, connect.NewRequest(&itemv1.ListItemBlockRulesRequest{}))
		assert.NilError(t, err)
		assert.Assert(t, len(res.Msg.Rules) >= 2)
	})

	t.Run("DeleteItemBlockRule", func(t *testing.T) {
		// Get ID from list
		resList, _ := server.ListItemBlockRules(ctx, connect.NewRequest(&itemv1.ListItemBlockRulesRequest{}))
		id := resList.Msg.Rules[0].Id

		_, err := server.DeleteItemBlockRule(ctx, connect.NewRequest(&itemv1.DeleteItemBlockRuleRequest{Id: id}))
		assert.NilError(t, err)

		// Verify deletion
		resList2, _ := server.ListItemBlockRules(ctx, connect.NewRequest(&itemv1.ListItemBlockRulesRequest{}))
		for _, r := range resList2.Msg.Rules {
			assert.Assert(t, r.Id != id)
		}
	})
}
