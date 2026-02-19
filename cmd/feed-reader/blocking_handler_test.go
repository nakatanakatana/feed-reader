package main

import (
	"bytes"
	"context"
	"log/slog"
	"testing"
	"time"

	"connectrpc.com/connect"
	blockingv1 "github.com/nakatanakatana/feed-reader/gen/go/blocking/v1"
	"github.com/nakatanakatana/feed-reader/store"
	"gotest.tools/v3/assert"
)

func TestBlockingServer_TriggerUpdate(t *testing.T) {
	ctx := context.Background()
	queries, db := setupTestDB(t)
	s := store.NewStore(db)
	logger := slog.New(slog.NewJSONHandler(&bytes.Buffer{}, nil))

	// 1. Setup item that should be blocked
	_, _ = queries.CreateItem(ctx, store.CreateItemParams{
		ID:  "item-to-block",
		Url: "https://spam.com/1",
	})

	// 2. Setup services
	pool := NewWorkerPool(1)
	pool.Start(ctx)
	// We don't Wait() yet because we want to see it process the task

	bs := NewBlockingService()
	bgs := NewBlockingBackgroundService(s, bs, logger)
	server := NewBlockingServer(s, bgs, pool, logger)

	// 3. Create rule via server
	_, err := server.CreateBlockingRule(ctx, connect.NewRequest(&blockingv1.CreateBlockingRuleRequest{
		RuleType: "user_domain",
		Domain:   ptr("spam.com"),
	}))
	assert.NilError(t, err)

	// 4. Wait for background task to complete
	success := false
	for i := 0; i < 10; i++ {
		items, _ := queries.ListAllItems(ctx)
		for _, it := range items {
			if it.ID == "item-to-block" && it.IsHidden == 1 {
				success = true
				break
			}
		}
		if success {
			break
		}
		time.Sleep(50 * time.Millisecond)
	}
	assert.Assert(t, success, "Item should have been hidden by background process")
}

func TestBlockingServer_Validation(t *testing.T) {
	ctx := context.Background()
	_, db := setupTestDB(t)
	s := store.NewStore(db)
	logger := slog.New(slog.NewJSONHandler(&bytes.Buffer{}, nil))
	server := NewBlockingServer(s, nil, nil, logger)

	t.Run("CreateBlockingRule validation", func(t *testing.T) {
		// Invalid rule type
		_, err := server.CreateBlockingRule(ctx, connect.NewRequest(&blockingv1.CreateBlockingRuleRequest{
			RuleType: "invalid",
		}))
		assert.ErrorContains(t, err, "invalid rule_type")

		// missing fields for user_domain
		_, err = server.CreateBlockingRule(ctx, connect.NewRequest(&blockingv1.CreateBlockingRuleRequest{
			RuleType: "user_domain",
		}))
		assert.ErrorContains(t, err, "either username or domain must be provided")

		// missing fields for keyword
		_, err = server.CreateBlockingRule(ctx, connect.NewRequest(&blockingv1.CreateBlockingRuleRequest{
			RuleType: "keyword",
		}))
		assert.ErrorContains(t, err, "keyword must be provided")
	})

	t.Run("CreateURLParsingRule validation", func(t *testing.T) {
		// Empty domain
		_, err := server.CreateURLParsingRule(ctx, connect.NewRequest(&blockingv1.CreateURLParsingRuleRequest{
			Domain: "",
		}))
		assert.ErrorContains(t, err, "domain must not be empty")

		// Invalid regex
		_, err = server.CreateURLParsingRule(ctx, connect.NewRequest(&blockingv1.CreateURLParsingRuleRequest{
			Domain:  "example.com",
			Pattern: "[",
		}))
		assert.ErrorContains(t, err, "invalid regex pattern")
	})
}
