package main

import (
	"bytes"
	"context"
	"log/slog"
	"testing"
	"time"

	"github.com/mmcdole/gofeed"
	"github.com/nakatanakatana/feed-reader/store"
)

func TestFetcherService_FetchAndSave(t *testing.T) {
	ctx := context.Background()
	queries, db := setupTestDB(t)
	s := store.NewStore(db)

	// Setup a feed in DB
	feed, err := queries.CreateFeed(ctx, store.CreateFeedParams{
		Uuid: "test-uuid",
		Url:  "https://example.com/rss",
	})
	if err != nil {
		t.Fatalf("failed to create feed: %v", err)
	}

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
	service := NewFetcherService(s, fetcher, nil, logger, 30*time.Minute)

	err = service.FetchAndSave(ctx, feed)
	if err != nil {
		t.Errorf("FetchAndSave() error = %v", err)
	}

	// Verify items are saved
	items, err := queries.ListItemsByFeed(ctx, feed.Uuid)
	if err != nil {
		t.Fatalf("failed to get items: %v", err)
	}

	if len(items) != 2 {
		t.Errorf("expected 2 items, got %d", len(items))
	}

	found1 := false
	for _, item := range items {
		if item.Url == "https://example.com/1" {
			found1 = true
			if item.Title == nil || *item.Title != "Item 1" {
				t.Errorf("expected title 'Item 1', got %v", item.Title)
			}
		}
	}
	if !found1 {
		t.Error("item 1 not found in DB")
	}
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
	service := NewFetcherService(s, fetcher, pool, logger, interval)

	// Case 1: Feed fetched recently (should NOT fetch)
	recentTime := time.Now().Add(-5 * time.Minute).Format(time.RFC3339)
	feedRecent, _ := queries.CreateFeed(ctx, store.CreateFeedParams{Uuid: "recent", Url: "http://recent"})
	_ = queries.MarkFeedFetched(ctx, store.MarkFeedFetchedParams{Uuid: feedRecent.Uuid, LastFetchedAt: &recentTime})

	// Case 2: Feed fetched long ago (should fetch)
	oldTime := time.Now().Add(-60 * time.Minute).Format(time.RFC3339)
	feedOld, _ := queries.CreateFeed(ctx, store.CreateFeedParams{Uuid: "old", Url: "http://old"})
	_ = queries.MarkFeedFetched(ctx, store.MarkFeedFetchedParams{Uuid: feedOld.Uuid, LastFetchedAt: &oldTime})

	// Case 3: Feed never fetched (should fetch)
	feedNew, _ := queries.CreateFeed(ctx, store.CreateFeedParams{Uuid: "new", Url: "http://new"})

	// Run FetchAllFeeds
	err := service.FetchAllFeeds(ctx)
	if err != nil {
		t.Fatalf("FetchAllFeeds failed: %v", err)
	}

	// Wait for workers to finish
	pool.Wait()

	// Verify results
	// Recent feed should NOT have changed timestamp (or very minimally if we were unlucky, but we check if it is > recentTime + small delta? No, simpler: check if it was updated to NOW)
	// Actually, if it fetched, it would update timestamp to NOW.
	// So we check if timestamp is close to NOW vs close to recentTime.

	fRecent, _ := queries.GetFeed(ctx, feedRecent.Uuid)
	if *fRecent.LastFetchedAt != recentTime {
		t.Errorf("Recent feed should not have been fetched. Want %s, got %s", recentTime, *fRecent.LastFetchedAt)
	}

	fOld, _ := queries.GetFeed(ctx, feedOld.Uuid)
	if *fOld.LastFetchedAt == oldTime {
		t.Error("Old feed should have been fetched and updated")
	}

	fNew, _ := queries.GetFeed(ctx, feedNew.Uuid)
	if fNew.LastFetchedAt == nil {
		t.Error("New feed should have been fetched")
	}
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
	service := NewFetcherService(s, fetcher, pool, logger, interval)

	// Create a feed that was fetched recently (so normally wouldn't be fetched)
	recentTime := time.Now().Add(-1 * time.Minute).Format(time.RFC3339)
	feed, _ := queries.CreateFeed(ctx, store.CreateFeedParams{Uuid: "forced", Url: "http://forced"})
	_ = queries.MarkFeedFetched(ctx, store.MarkFeedFetchedParams{Uuid: feed.Uuid, LastFetchedAt: &recentTime})

	// Force refresh
	err := service.FetchFeedsByIDs(ctx, []string{feed.Uuid})
	if err != nil {
		t.Fatalf("FetchFeedsByIDs failed: %v", err)
	}

	pool.Wait()

	// Verify it was fetched (last_fetched_at updated to NOW)
	updatedFeed, _ := queries.GetFeed(ctx, feed.Uuid)
	if *updatedFeed.LastFetchedAt == recentTime {
		t.Error("Feed should have been force refreshed")
	}
}
