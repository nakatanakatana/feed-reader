package main

import (
	"context"
	"testing"

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
		req := &itemv1.AddItemBlockRulesRequest{
			Rules: []*itemv1.AddItemBlockRulesRequest_Rule{
				{RuleType: "user", Value: "user1"},
				{RuleType: "domain", Value: "example.com"},
			},
		}
		_, err := server.AddItemBlockRules(ctx, connect.NewRequest(req))
		assert.NilError(t, err)
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
