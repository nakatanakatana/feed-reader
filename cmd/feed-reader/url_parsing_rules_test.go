package main

import (
	"context"
	"testing"

	"connectrpc.com/connect"
	"github.com/nakatanakatana/feed-reader/gen/go/item/v1"
	"github.com/nakatanakatana/feed-reader/store"
	"gotest.tools/v3/assert"
)

func TestItemServer_URLParsingRules(t *testing.T) {
	ctx := context.Background()
	_, db := setupTestDB(t)
	s := store.NewStore(db)
	server := NewItemServer(s, nil)

	t.Run("AddURLParsingRule", func(t *testing.T) {
		req := &itemv1.AddURLParsingRuleRequest{
			Domain:   "example.com",
			RuleType: "subdomain",
			Pattern:  "example.com",
		}
		res, err := server.AddURLParsingRule(ctx, connect.NewRequest(req))
		assert.NilError(t, err)
		assert.Assert(t, res.Msg.Rule.Id != "")
		assert.Equal(t, res.Msg.Rule.Domain, "example.com")
		assert.Equal(t, res.Msg.Rule.RuleType, "subdomain")
		assert.Equal(t, res.Msg.Rule.Pattern, "example.com")
	})

	t.Run("ListURLParsingRules", func(t *testing.T) {
		res, err := server.ListURLParsingRules(ctx, connect.NewRequest(&itemv1.ListURLParsingRulesRequest{}))
		assert.NilError(t, err)
		assert.Assert(t, len(res.Msg.Rules) >= 1)
	})

	t.Run("DeleteURLParsingRule", func(t *testing.T) {
		// Get ID from list
		resList, _ := server.ListURLParsingRules(ctx, connect.NewRequest(&itemv1.ListURLParsingRulesRequest{}))
		id := resList.Msg.Rules[0].Id

		_, err := server.DeleteURLParsingRule(ctx, connect.NewRequest(&itemv1.DeleteURLParsingRuleRequest{Id: id}))
		assert.NilError(t, err)

		// Verify deletion
		resList2, _ := server.ListURLParsingRules(ctx, connect.NewRequest(&itemv1.ListURLParsingRulesRequest{}))
		for _, r := range resList2.Msg.Rules {
			assert.Assert(t, r.Id != id)
		}
	})
}
