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

func TestItemBlockingIntegration(t *testing.T) {
	ctx := context.Background()
	queries, db := setupTestDB(t)
	s := store.NewStore(db)
	logger := slog.New(slog.NewJSONHandler(&bytes.Buffer{}, nil))

	// 1. Setup URL Parsing Rule
	_, err := queries.CreateURLParsingRule(ctx, store.CreateURLParsingRuleParams{
		ID:      "rule-1",
		Domain:  "example.com",
		Pattern: `^https://example\.com/users/([^/]+)`,
	})
	assert.NilError(t, err)

	// 2. Setup Blocking Rule for a user on that domain
	_, err = queries.CreateBlockingRule(ctx, store.CreateBlockingRuleParams{
		ID:       "block-1",
		RuleType: "user_domain",
		Username: ptr("spammer"),
		Domain:   ptr("example.com"),
	})
	assert.NilError(t, err)

	// 3. Setup Fetcher components
	mockFeed := &gofeed.Feed{
		Items: []*gofeed.Item{
			{
				Title: "Legit Item",
				Link:  "https://example.com/users/jdoe/posts/1",
			},
			{
				Title: "Spammy Item",
				Link:  "https://example.com/users/spammer/posts/2",
			},
		},
	}
	fetcher := &mockFetcher{feed: mockFeed}
	ue := NewUsernameExtractor()
	bs := NewBlockingService()
	wq := NewWriteQueueService(s, WriteQueueConfig{MaxBatchSize: 10, FlushInterval: 10 * time.Millisecond}, logger)
	go wq.Start(ctx)
	defer wq.Stop()

	svc := NewFetcherService(s, fetcher, ue, bs, nil, wq, logger, 30*time.Minute)

	// 4. Create feed in DB and fetch
	feed, _ := queries.CreateFeed(ctx, store.CreateFeedParams{ID: "f1", Url: "http://f1"})
	err = svc.FetchAndSave(ctx, store.FullFeed{ID: feed.ID, Url: feed.Url})
	assert.NilError(t, err)

	// Wait for WriteQueue
	time.Sleep(200 * time.Millisecond)

	// 5. Verify items in DB
	allItems, err := queries.ListAllItems(ctx)
	assert.NilError(t, err)
	assert.Equal(t, len(allItems), 2)

	var legitItem, spammyItem store.Item
	for _, it := range allItems {
		switch it.Url {
		case "https://example.com/users/jdoe/posts/1":
			legitItem = it
		case "https://example.com/users/spammer/posts/2":
			spammyItem = it
		}
	}

	assert.Equal(t, legitItem.IsHidden, int64(0))
	assert.Assert(t, legitItem.Username != nil)
	assert.Equal(t, *legitItem.Username, "jdoe")

	assert.Equal(t, spammyItem.IsHidden, int64(1))
	assert.Assert(t, spammyItem.Username != nil)
	assert.Equal(t, *spammyItem.Username, "spammer")

	// 6. Verify ListItems - should only return 1 item (Legit)
	items, err := queries.ListItems(ctx, store.ListItemsParams{Limit: 10})
	assert.NilError(t, err)
	assert.Equal(t, len(items), 1)
	assert.Equal(t, *items[0].Title, "Legit Item")

	// 7. Verify ListItems with include_hidden=true - should return 2 items
	itemsAll, err := queries.ListItems(ctx, store.ListItemsParams{Limit: 10, IncludeHidden: true})
	assert.NilError(t, err)
	assert.Equal(t, len(itemsAll), 2)
}
