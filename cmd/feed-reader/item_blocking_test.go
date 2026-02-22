package main

import (
	"context"
	"testing"

	"connectrpc.com/connect"
	"github.com/google/uuid"
	"github.com/nakatanakatana/feed-reader/gen/go/item/v1"
	"github.com/nakatanakatana/feed-reader/store"
	"gotest.tools/v3/assert"
	"gotest.tools/v3/assert/cmp"
)

func TestItemServer_Blocking(t *testing.T) {
	ctx := context.Background()
	queries, db := setupTestDB(t)
	s := store.NewStore(db)
	server := NewItemServer(s, nil)

	// Setup Feed
	feedID := uuid.NewString()
	_, _ = queries.CreateFeed(ctx, store.CreateFeedParams{
		ID:  feedID,
		Url: "http://example.com/feed",
	})

	// Create 3 items
	item1ID := uuid.NewString()
	_, _ = queries.CreateItem(ctx, store.CreateItemParams{ID: item1ID, Url: "http://example.com/item1"})
	_ = queries.CreateFeedItem(ctx, store.CreateFeedItemParams{FeedID: feedID, ItemID: item1ID})

	item2ID := uuid.NewString()
	_, _ = queries.CreateItem(ctx, store.CreateItemParams{ID: item2ID, Url: "http://example.com/item2"})
	_ = queries.CreateFeedItem(ctx, store.CreateFeedItemParams{FeedID: feedID, ItemID: item2ID})

	item3ID := uuid.NewString()
	_, _ = queries.CreateItem(ctx, store.CreateItemParams{ID: item3ID, Url: "http://example.com/item3"})
	_ = queries.CreateFeedItem(ctx, store.CreateFeedItemParams{FeedID: feedID, ItemID: item3ID})

	// Block item 2
	ruleID := uuid.NewString()
	_, _ = s.CreateItemBlockRule(ctx, store.CreateItemBlockRuleParams{
		ID:        ruleID,
		RuleType:  "keyword",
		RuleValue: "blocked",
	})
	_ = s.CreateItemBlock(ctx, store.CreateItemBlockParams{
		ItemID: item2ID,
		RuleID: ruleID,
	})

	t.Run("ListItems excludes blocked items", func(t *testing.T) {
		res, err := server.ListItems(ctx, connect.NewRequest(&itemv1.ListItemsRequest{
			Limit: 10,
		}))
		assert.NilError(t, err)
		assert.Assert(t, cmp.Len(res.Msg.Items, 2))
		for _, item := range res.Msg.Items {
			assert.Assert(t, item.Id != item2ID)
		}
		assert.Equal(t, res.Msg.TotalCount, int32(2))
	})
}
