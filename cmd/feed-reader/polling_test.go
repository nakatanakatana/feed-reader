package main

import (
	"context"
	"log/slog"
	"os"
	"testing"
	"time"

	"github.com/mmcdole/gofeed"
	"github.com/nakatanakatana/feed-reader/store"
	"gotest.tools/v3/assert"
)

type pollingMockFetcher struct {
	fetchCount int
}

func (m *pollingMockFetcher) Fetch(ctx context.Context, feedID string, url string) (*gofeed.Feed, error) {
	m.fetchCount++
	return &gofeed.Feed{
		Items: []*gofeed.Item{},
	}, nil
}

func TestPollingRespectsSchedule(t *testing.T) {
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	_, db := setupTestDB(t)
	defer db.Close()

	s := store.NewStore(db)
	fetcher := &pollingMockFetcher{}
	logger := slog.New(slog.NewTextHandler(os.Stdout, nil))
	
	// Create worker pool and write queue
	pool := NewWorkerPool(2)
	go pool.Start(ctx)
	
	wq := NewWriteQueueService(s, WriteQueueConfig{
		MaxBatchSize:  10,
		FlushInterval: 10 * time.Millisecond,
	}, logger)
	go wq.Start(ctx)
	defer wq.Stop()

	svc := NewFetcherService(s, fetcher, pool, wq, logger, 1*time.Hour)

	// 1. Add a feed
	feed, err := s.CreateFeed(ctx, store.CreateFeedParams{
		ID:  "feed1",
		Url: "http://example.com/feed1",
	})
	assert.NilError(t, err)

	// 2. Run FetchAllFeeds - should fetch the feed
	logger.Info("Step 2: FetchAllFeeds (initial)")
	err = svc.FetchAllFeeds(ctx)
	assert.NilError(t, err)

	// Wait for async processing
	time.Sleep(500 * time.Millisecond)
	assert.Equal(t, fetcher.fetchCount, 1)

	// 3. Verify next_fetch is updated to future
	f, err := s.GetFeed(ctx, feed.ID)
	assert.NilError(t, err)
	assert.Assert(t, f.NextFetch != nil)
	logger.Info("Step 3: Verified next_fetch", "nextFetch", *f.NextFetch)
	
	nextFetch, err := time.Parse(time.RFC3339, *f.NextFetch)
	assert.NilError(t, err)
	assert.Assert(t, nextFetch.After(time.Now()))

	// 4. Run FetchAllFeeds again - should NOT fetch because it's too early
	logger.Info("Step 4: FetchAllFeeds (too early)")
	err = svc.FetchAllFeeds(ctx)
	assert.NilError(t, err)
	time.Sleep(500 * time.Millisecond)
	assert.Equal(t, fetcher.fetchCount, 1) // still 1

	// 5. Manually set next_fetch to past (using UTC to match SQLite's strftime 'now')
	past := time.Now().UTC().Add(-10 * time.Minute).Format(time.RFC3339)
	logger.Info("Step 5: Manually setting next_fetch to past", "past", past)
	err = s.MarkFeedFetched(ctx, store.MarkFeedFetchedParams{
		FeedID:    feed.ID,
		NextFetch: &past,
	})
	assert.NilError(t, err)

	// Verify it was set
	f2, err := s.GetFeed(ctx, feed.ID)
	assert.NilError(t, err)
	logger.Info("Verified past next_fetch", "nextFetch", *f2.NextFetch)

	// 6. Run FetchAllFeeds again - should fetch now
	logger.Info("Step 6: FetchAllFeeds (now due)")
	err = svc.FetchAllFeeds(ctx)
	assert.NilError(t, err)
	time.Sleep(1000 * time.Millisecond) // Increased wait
	assert.Equal(t, fetcher.fetchCount, 2)
}
