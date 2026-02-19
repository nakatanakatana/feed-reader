package main

import (
	"bytes"
	"context"
	"fmt"
	"log/slog"
	"testing"
	"time"

	"github.com/mmcdole/gofeed"
	"github.com/nakatanakatana/feed-reader/store"
	"gotest.tools/v3/assert"
	"pgregory.net/rapid"
)

func TestFetcherService_normalizeItem_PBT(t *testing.T) {
	ctx := context.Background()
	s := &FetcherService{
		usernameExtractor: NewUsernameExtractor(),
		blockingService:   NewBlockingService(),
		logger:            slog.New(slog.NewJSONHandler(&bytes.Buffer{}, nil)),
	}

	rapid.Check(t, func(t *rapid.T) {
		feedID := rapid.String().Draw(t, "feedID")
		item := &gofeed.Item{
			Title:       rapid.String().Draw(t, "title"),
			Link:        rapid.String().Draw(t, "link"),
			Description: rapid.String().Draw(t, "description"),
			GUID:        rapid.String().Draw(t, "guid"),
			Content:     rapid.String().Draw(t, "content"),
			Image: &gofeed.Image{
				URL: rapid.String().Draw(t, "imageUrl"),
			},
			Categories: rapid.SliceOf(rapid.String()).Draw(t, "categories"),
		}

		hasPubDate := rapid.Bool().Draw(t, "hasPubDate")
		if hasPubDate {
			pubDate := time.Unix(rapid.Int64Range(0, 2e9).Draw(t, "pubDate"), 0)
			item.PublishedParsed = &pubDate
		}

		params := s.normalizeItem(ctx, feedID, item, nil, nil)

		assert.Equal(t, params.FeedID, feedID)
		assert.Equal(t, params.Url, item.Link)
		assert.Equal(t, *params.Title, item.Title)
		assert.Equal(t, *params.Description, item.Description)
		assert.Equal(t, *params.Guid, item.GUID)
		assert.Equal(t, *params.Content, item.Content)
		assert.Equal(t, *params.ImageUrl, item.Image.URL)

		if len(item.Categories) > 0 {
			assert.Assert(t, params.Categories != nil)
			// Optional: verify JSON content
		} else {
			assert.Assert(t, params.Categories == nil)
		}

		if hasPubDate {
			assert.Assert(t, params.PublishedAt != nil)
			assert.Equal(t, *params.PublishedAt, item.PublishedParsed.Format(time.RFC3339))
		} else {
			assert.Assert(t, params.PublishedAt == nil)
		}
	})
}

func TestFetcherService_FetchAndSave(t *testing.T) {
	ctx := context.Background()
	queries, db := setupTestDB(t)
	s := store.NewStore(db)

	// Setup a feed in DB
	feed, err := queries.CreateFeed(ctx, store.CreateFeedParams{
		ID:  "test-uuid",
		Url: "https://example.com/rss",
	})
	assert.NilError(t, err, "failed to create feed")

	mockFeed := &gofeed.Feed{
		Items: []*gofeed.Item{
			{
				Title:           "Item 1",
				Link:            "https://example.com/1",
				Description:     "Desc 1",
				GUID:            "guid-1",
				PublishedParsed: &[]time.Time{time.Now()}[0],
				Author: &gofeed.Person{
					Name: "Author 1",
				},
			},
			{
				Title:       "Item 2",
				Link:        "https://example.com/2",
				Description: "Desc 2",
				GUID:        "guid-2",
				Authors: []*gofeed.Person{
					{Name: "Author 2"},
				},
			},
		},
	}

	fetcher := &mockFetcher{feed: mockFeed}
	logger := slog.New(slog.NewJSONHandler(&bytes.Buffer{}, nil))
	wq := NewWriteQueueService(s, WriteQueueConfig{MaxBatchSize: 1, FlushInterval: 10 * time.Millisecond}, logger)
	go wq.Start(ctx)
	service := NewFetcherService(s, fetcher, NewUsernameExtractor(), NewBlockingService(), nil, wq, logger, 30*time.Minute)

	err = service.FetchAndSave(ctx, store.FullFeed{
		ID:  feed.ID,
		Url: feed.Url,
	})
	assert.NilError(t, err)

	// Wait for WriteQueue to process jobs
	time.Sleep(100 * time.Millisecond)

	// Verify items are saved
	items, err := queries.ListItems(ctx, store.ListItemsParams{FeedID: feed.ID, Limit: 10})
	assert.NilError(t, err, "failed to get items")
	assert.Equal(t, len(items), 2)

	found1 := false
	found2 := false
	for _, item := range items {
		if item.Url == "https://example.com/1" {
			found1 = true
			assert.Assert(t, item.Title != nil)
			assert.Equal(t, *item.Title, "Item 1")
			assert.Assert(t, item.Author != nil)
			assert.Equal(t, *item.Author, "Author 1")
		}
		if item.Url == "https://example.com/2" {
			found2 = true
			assert.Assert(t, item.Author != nil)
			assert.Equal(t, *item.Author, "Author 2")
		}
	}
	assert.Assert(t, found1, "item 1 not found in DB")
	assert.Assert(t, found2, "item 2 not found in DB")
}

func TestFetcherService_FetchAllFeeds_Interval(t *testing.T) {
	ctx := context.Background()
	queries, db := setupTestDB(t)
	s := store.NewStore(db)

	fetcher := &mockFetcher{feed: &gofeed.Feed{Title: "Fetched"}}
	pool := NewWorkerPool(1)
	pool.Start(ctx)

	logger := slog.New(slog.NewJSONHandler(&bytes.Buffer{}, nil))
	interval := 30 * time.Minute
	wq := NewWriteQueueService(s, WriteQueueConfig{MaxBatchSize: 1, FlushInterval: 10 * time.Millisecond}, logger)
	go wq.Start(ctx)
	service := NewFetcherService(s, fetcher, NewUsernameExtractor(), NewBlockingService(), pool, wq, logger, interval)

	// Case 1: Feed scheduled for FUTURE (should NOT fetch)
	futureTime := time.Now().UTC().Add(1 * time.Hour).Format("2006-01-02T15:04:05Z")
	feedRecent, _ := queries.CreateFeed(ctx, store.CreateFeedParams{ID: "recent", Url: "http://recent"})
	_ = queries.MarkFeedFetched(ctx, store.MarkFeedFetchedParams{FeedID: feedRecent.ID, NextFetch: &futureTime})

	// Case 2: Feed scheduled for PAST (should fetch)
	pastTime := time.Now().UTC().Add(-1 * time.Hour).Format("2006-01-02T15:04:05Z")
	feedOld, _ := queries.CreateFeed(ctx, store.CreateFeedParams{ID: "old", Url: "http://old"})
	_ = queries.MarkFeedFetched(ctx, store.MarkFeedFetchedParams{FeedID: feedOld.ID, NextFetch: &pastTime})

	// Case 3: Feed never fetched/scheduled (next_fetch is NULL) (should fetch)
	feedNew, _ := queries.CreateFeed(ctx, store.CreateFeedParams{ID: "new", Url: "http://new"})

	// Run FetchAllFeeds
	var dbNow string
	_ = db.QueryRow("SELECT CURRENT_TIMESTAMP").Scan(&dbNow)
	t.Logf("DB NOW: %s", dbNow)

	sfeeds, _ := queries.ListFeedsToFetch(ctx)
	t.Logf("Feeds to fetch count: %d", len(sfeeds))
	for _, sf := range sfeeds {
		t.Logf("Due feed: ID=%s, NextFetch=%v", sf.ID, sf.NextFetch)
	}

	err := service.FetchAllFeeds(ctx)
	assert.NilError(t, err)

	// Wait for workers to finish
	pool.Wait()
	// Wait for WriteQueue to process jobs (asynchronous update)
	time.Sleep(200 * time.Millisecond)

	// Verify results
	fRecent, _ := queries.GetFeed(ctx, feedRecent.ID)
	assert.Equal(t, *fRecent.NextFetch, futureTime, "Feed scheduled for future should not have been fetched")

	fOld, _ := queries.GetFeed(ctx, feedOld.ID)
	if *fOld.NextFetch == pastTime {
		t.Errorf("fOld.NextFetch is still %s, expected it to be updated", pastTime)
	}
	assert.Assert(t, fOld.LastFetchedAt != nil)

	fNew, _ := queries.GetFeed(ctx, feedNew.ID)
	assert.Assert(t, fNew.NextFetch != nil, "New feed should have been fetched and scheduled")
	assert.Assert(t, fNew.LastFetchedAt != nil)
}

func TestFetcherService_FetchFeedsByIDs(t *testing.T) {
	ctx := context.Background()
	queries, db := setupTestDB(t)
	s := store.NewStore(db)

	fetcher := &mockFetcher{feed: &gofeed.Feed{Title: "Forced"}}
	pool := NewWorkerPool(1)
	pool.Start(ctx)

	logger := slog.New(slog.NewJSONHandler(&bytes.Buffer{}, nil))
	interval := 30 * time.Minute
	wq := NewWriteQueueService(s, WriteQueueConfig{MaxBatchSize: 1, FlushInterval: 10 * time.Millisecond}, logger)
	go wq.Start(ctx)
	service := NewFetcherService(s, fetcher, NewUsernameExtractor(), NewBlockingService(), pool, wq, logger, interval)

	// Create a feed that was fetched recently (so normally wouldn't be fetched)
	recentTime := time.Now().Add(-1 * time.Minute).Format(time.RFC3339)
	feed, _ := queries.CreateFeed(ctx, store.CreateFeedParams{ID: "forced", Url: "http://forced"})
	_ = queries.MarkFeedFetched(ctx, store.MarkFeedFetchedParams{FeedID: feed.ID, LastFetchedAt: &recentTime})

	// Force refresh
	err := service.FetchFeedsByIDs(ctx, []string{feed.ID})
	assert.NilError(t, err)

	pool.Wait()
	// Wait for WriteQueue
	time.Sleep(50 * time.Millisecond)

	// Verify it was fetched (last_fetched_at updated to NOW)
	updatedFeed, _ := queries.GetFeed(ctx, feed.ID)
	assert.Assert(t, *updatedFeed.LastFetchedAt != recentTime, "Feed should have been force refreshed")
}

func TestFetcherService_FetchFeedsByIDsSync(t *testing.T) {
	ctx := context.Background()
	queries, db := setupTestDB(t)
	s := store.NewStore(db)

	mockFeed := &gofeed.Feed{
		Items: []*gofeed.Item{
			{Title: "New Item", Link: "http://new-item"},
		},
	}
	fetcher := &mockFetcher{feed: mockFeed}
	logger := slog.New(slog.NewJSONHandler(&bytes.Buffer{}, nil))
	wq := NewWriteQueueService(s, WriteQueueConfig{MaxBatchSize: 1, FlushInterval: 10 * time.Millisecond}, logger)
	go wq.Start(ctx)
	service := NewFetcherService(s, fetcher, NewUsernameExtractor(), NewBlockingService(), nil, wq, logger, 30*time.Minute)

	feed, _ := queries.CreateFeed(ctx, store.CreateFeedParams{ID: "sync-fetch", Url: "http://sync-fetch"})

	results, err := service.FetchFeedsByIDsSync(ctx, []string{feed.ID})
	assert.NilError(t, err)
	assert.Equal(t, len(results), 1)
	assert.Equal(t, results[0].FeedID, feed.ID)
	assert.Assert(t, results[0].Success)
}

func TestFetcherService_AdaptiveInterval(t *testing.T) {
	ctx := context.Background()
	queries, db := setupTestDB(t)
	s := store.NewStore(db)

	logger := slog.New(slog.NewJSONHandler(&bytes.Buffer{}, nil))
	defaultInterval := 1 * time.Hour
	wq := NewWriteQueueService(s, WriteQueueConfig{MaxBatchSize: 1, FlushInterval: 10 * time.Millisecond}, logger)
	go wq.Start(ctx)
	fetcher := &mockFetcher{feed: &gofeed.Feed{}}
	service := NewFetcherService(s, fetcher, NewUsernameExtractor(), NewBlockingService(), nil, wq, logger, defaultInterval)

	t.Run("frequent updates", func(t *testing.T) {
		feed, _ := queries.CreateFeed(ctx, store.CreateFeedParams{ID: "frequent", Url: "http://frequent"})
		now := time.Now()
		for i := range 5 {
			pubAt := now.Add(time.Duration(-5*i) * time.Minute).Format(time.RFC3339)
			_ = s.SaveFetchedItem(ctx, store.SaveFetchedItemParams{
				FeedID:      feed.ID,
				Url:         fmt.Sprintf("http://frequent/%d", i),
				PublishedAt: &pubAt,
			})
		}

		err := service.FetchAndSave(ctx, store.FullFeed{ID: feed.ID, Url: feed.Url})
		assert.NilError(t, err)
		time.Sleep(100 * time.Millisecond)

		updated, _ := queries.GetFeed(ctx, feed.ID)
		nextFetch, _ := time.Parse(time.RFC3339, *updated.NextFetch)
		lastFetched, _ := time.Parse(time.RFC3339, *updated.LastFetchedAt)
		diff := nextFetch.Sub(lastFetched)
		// Expected 15m (min limit)
		assert.Assert(t, diff >= 14*time.Minute && diff <= 16*time.Minute, "Expected ~15m interval, got %v", diff)
	})

	t.Run("rare updates", func(t *testing.T) {
		feed, _ := queries.CreateFeed(ctx, store.CreateFeedParams{ID: "rare", Url: "http://rare"})
		now := time.Now()
		for i := range 3 {
			pubAt := now.Add(time.Duration(-48*i) * time.Hour).Format(time.RFC3339)
			_ = s.SaveFetchedItem(ctx, store.SaveFetchedItemParams{
				FeedID:      feed.ID,
				Url:         fmt.Sprintf("http://rare/%d", i),
				PublishedAt: &pubAt,
			})
		}

		err := service.FetchAndSave(ctx, store.FullFeed{ID: feed.ID, Url: feed.Url})
		assert.NilError(t, err)
		time.Sleep(100 * time.Millisecond)

		updated, _ := queries.GetFeed(ctx, feed.ID)
		nextFetch, _ := time.Parse(time.RFC3339, *updated.NextFetch)
		lastFetched, _ := time.Parse(time.RFC3339, *updated.LastFetchedAt)
		diff := nextFetch.Sub(lastFetched)
		// Expected 24h (max limit)
		assert.Assert(t, diff >= 23*time.Hour && diff <= 25*time.Hour, "Expected ~24h interval, got %v", diff)
	})

	t.Run("no items fallback", func(t *testing.T) {
		feed, _ := queries.CreateFeed(ctx, store.CreateFeedParams{ID: "newbie", Url: "http://newbie"})
		err := service.FetchAndSave(ctx, store.FullFeed{ID: feed.ID, Url: feed.Url})
		assert.NilError(t, err)
		time.Sleep(100 * time.Millisecond)

		updated, _ := queries.GetFeed(ctx, feed.ID)
		nextFetch, _ := time.Parse(time.RFC3339, *updated.NextFetch)
		lastFetched, _ := time.Parse(time.RFC3339, *updated.LastFetchedAt)
		diff := nextFetch.Sub(lastFetched)
		// Expected defaultInterval (1h)
		assert.Assert(t, diff >= 59*time.Minute && diff <= 61*time.Minute, "Expected ~1h interval, got %v", diff)
	})
}
