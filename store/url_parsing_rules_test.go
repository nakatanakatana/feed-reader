package store_test

import (
	"context"
	"testing"

	"github.com/google/uuid"
	"github.com/nakatanakatana/feed-reader/store"
	"gotest.tools/v3/assert"
)

func TestURLParsingRules(t *testing.T) {
	s := setupStore(t)
	ctx := context.Background()

	// 1. Add a rule
	id := uuid.NewString()
	domain := "example.com"
	ruleType := "subdomain"
	pattern := "example.com"

	params := store.CreateURLParsingRuleParams{
		ID:       id,
		Domain:   domain,
		RuleType: ruleType,
		Pattern:  pattern,
	}

	rule, err := s.CreateURLParsingRule(ctx, params)
	assert.NilError(t, err)
	assert.Equal(t, rule.ID, id)
	assert.Equal(t, rule.Domain, domain)
	assert.Equal(t, rule.RuleType, ruleType)
	assert.Equal(t, rule.Pattern, pattern)

	// 2. List rules
	rules, err := s.ListURLParsingRules(ctx)
	assert.NilError(t, err)
	assert.Assert(t, len(rules) >= 1)

	// 3. Delete rule
	err = s.DeleteURLParsingRule(ctx, id)
	assert.NilError(t, err)

	// 4. Verify deletion
	rules, err = s.ListURLParsingRules(ctx)
	assert.NilError(t, err)
	for _, r := range rules {
		assert.Assert(t, r.ID != id)
	}
}
