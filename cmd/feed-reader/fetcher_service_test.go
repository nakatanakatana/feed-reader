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
	"pgregory.net/rapid"
)

func TestFetcherService_normalizeItem_PBT(t *testing.T) {
	s := &FetcherService{}

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

		params := s.normalizeItem(feedID, item)

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
			},
			{
				Title:       "Item 2",
				Link:        "https://example.com/2",
				Description: "Desc 2",
				GUID:        "guid-2",
			},
		},
	}

	fetcher := &mockFetcher{feed: mockFeed}
	logger := slog.New(slog.NewJSONHandler(&bytes.Buffer{}, nil))
	wq := NewWriteQueueService(s, WriteQueueConfig{MaxBatchSize: 1, FlushInterval: 10 * time.Millisecond}, logger)
	go wq.Start(ctx)
	service := NewFetcherService(s, fetcher, nil, wq, logger, 30*time.Minute)

	err = service.FetchAndSave(ctx, feed)
	assert.NilError(t, err)

	// Wait for WriteQueue to process jobs
	time.Sleep(50 * time.Millisecond)

	// Verify items are saved
	items, err := queries.ListItems(ctx, store.ListItemsParams{FeedID: feed.ID, Limit: 10})
	assert.NilError(t, err, "failed to get items")
	assert.Equal(t, len(items), 2)

	found1 := false
	for _, item := range items {
		if item.Url == "https://example.com/1" {
			found1 = true
			assert.Assert(t, item.Title != nil)
			assert.Equal(t, *item.Title, "Item 1")
		}
	}
	assert.Assert(t, found1, "item 1 not found in DB")
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
	service := NewFetcherService(s, fetcher, pool, wq, logger, interval)

	// Case 1: Feed fetched recently (should NOT fetch)
	recentTime := time.Now().Add(-5 * time.Minute).Format(time.RFC3339)
	feedRecent, _ := queries.CreateFeed(ctx, store.CreateFeedParams{ID: "recent", Url: "http://recent"})
	_ = queries.MarkFeedFetched(ctx, store.MarkFeedFetchedParams{ID: feedRecent.ID, LastFetchedAt: &recentTime})

	// Case 2: Feed fetched long ago (should fetch)
	oldTime := time.Now().Add(-60 * time.Minute).Format(time.RFC3339)
	feedOld, _ := queries.CreateFeed(ctx, store.CreateFeedParams{ID: "old", Url: "http://old"})
	_ = queries.MarkFeedFetched(ctx, store.MarkFeedFetchedParams{ID: feedOld.ID, LastFetchedAt: &oldTime})

	// Case 3: Feed never fetched (should fetch)
	feedNew, _ := queries.CreateFeed(ctx, store.CreateFeedParams{ID: "new", Url: "http://new"})

	// Run FetchAllFeeds
	err := service.FetchAllFeeds(ctx)
	assert.NilError(t, err)

	// Wait for workers to finish
	pool.Wait()
	// Wait for WriteQueue to process jobs
	time.Sleep(50 * time.Millisecond)

	// Verify results
	fRecent, _ := queries.GetFeed(ctx, feedRecent.ID)
	assert.Equal(t, *fRecent.LastFetchedAt, recentTime, "Recent feed should not have been fetched")

	fOld, _ := queries.GetFeed(ctx, feedOld.ID)
	assert.Assert(t, *fOld.LastFetchedAt != oldTime, "Old feed should have been fetched and updated")

	fNew, _ := queries.GetFeed(ctx, feedNew.ID)
	assert.Assert(t, fNew.LastFetchedAt != nil, "New feed should have been fetched")
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
	service := NewFetcherService(s, fetcher, pool, wq, logger, interval)

	// Create a feed that was fetched recently (so normally wouldn't be fetched)
	recentTime := time.Now().Add(-1 * time.Minute).Format(time.RFC3339)
	feed, _ := queries.CreateFeed(ctx, store.CreateFeedParams{ID: "forced", Url: "http://forced"})
	_ = queries.MarkFeedFetched(ctx, store.MarkFeedFetchedParams{ID: feed.ID, LastFetchedAt: &recentTime})

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
	service := NewFetcherService(s, fetcher, nil, wq, logger, 30*time.Minute)

	feed, _ := queries.CreateFeed(ctx, store.CreateFeedParams{ID: "sync-fetch", Url: "http://sync-fetch"})

	results, err := service.FetchFeedsByIDsSync(ctx, []string{feed.ID})
	assert.NilError(t, err)
	assert.Equal(t, len(results), 1)
	assert.Equal(t, results[0].FeedID, feed.ID)
	assert.Assert(t, results[0].Success)
}
