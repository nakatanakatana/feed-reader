package main

import (
	"bytes"
	"context"
	"log/slog"
	"testing"
	"time"

	"github.com/mmcdole/gofeed"
	"github.com/nakatanakatana/feed-reader/store"
	"gotest.tools/v3/assert"
)

func TestFetcherService_BlockingDuringIngestion(t *testing.T) {
	ctx := context.Background()
	queries, db := setupTestDB(t)
	s := store.NewStore(db)

	// 1. Setup a feed
	feed, err := queries.CreateFeed(ctx, store.CreateFeedParams{
		ID:  "feed-1",
		Url: "https://example.com/rss",
	})
	assert.NilError(t, err)

	// 2. Setup a block rule (keyword "Blocked")
	_, err = queries.CreateItemBlockRule(ctx, store.CreateItemBlockRuleParams{
		ID:        "rule-1",
		RuleType:  "keyword",
		RuleValue: "Blocked",
	})
	assert.NilError(t, err)

	// 3. Mock a feed with two items
	mockFeed := &gofeed.Feed{
		Items: []*gofeed.Item{
			{
				Title: "Normal Item",
				Link:  "https://example.com/normal",
				GUID:  "guid-normal",
			},
			{
				Title: "Blocked Item",
				Link:  "https://example.com/blocked",
				GUID:  "guid-blocked",
			},
		},
	}

	fetcher := &mockFetcher{feed: mockFeed}
	logger := slog.New(slog.NewJSONHandler(&bytes.Buffer{}, nil))
	wq := NewWriteQueueService(s, WriteQueueConfig{MaxBatchSize: 1, FlushInterval: 10 * time.Millisecond}, logger)
	go wq.Start(ctx)
	defer wq.Stop()

	service := NewFetcherService(s, fetcher, nil, wq, logger, 30*time.Minute)

	// 4. Fetch and Save
	err = service.FetchAndSave(ctx, store.FullFeed{
		ID:  feed.ID,
		Url: feed.Url,
	})
	assert.NilError(t, err)

	// Wait for WriteQueue to process jobs
	time.Sleep(200 * time.Millisecond)

	// 5. Verify results
	// The blocked item should NOT be in the list of non-blocked items
	items, err := s.ListItems(ctx, store.StoreListItemsParams{
		FeedID:    feed.ID,
		Limit:     10,
		IsBlocked: false,
	})
	assert.NilError(t, err)
	
	// Currently, this will FAIL because blocking logic is missing in FetcherService/WriteQueue
	assert.Equal(t, len(items), 1, "Expected only 1 non-blocked item, but got %d", len(items))
	assert.Equal(t, *items[0].Title, "Normal Item")

	// Verify that the blocked item exists but is blocked
	allItems, err := s.ListItems(ctx, store.StoreListItemsParams{
		FeedID:    feed.ID,
		Limit:     10,
		IsBlocked: nil, // Get all
	})
	assert.NilError(t, err)
	assert.Equal(t, len(allItems), 2)

	// Check item_blocks table
	var blockedItemID string
	for _, item := range allItems {
		if *item.Title == "Blocked Item" {
			blockedItemID = item.ID
		}
	}
	assert.Assert(t, blockedItemID != "", "Blocked item not found in DB")

	blocks, err := queries.ListItemBlocks(ctx, blockedItemID)
	assert.NilError(t, err)
	assert.Equal(t, len(blocks), 1, "Expected 1 block for the blocked item, but got %d", len(blocks))
	assert.Equal(t, blocks[0].RuleID, "rule-1")
}
