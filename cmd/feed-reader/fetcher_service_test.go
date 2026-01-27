package main

import (
	"bytes"
	"context"
	"log/slog"
	"testing"
	"time"

	"github.com/mmcdole/gofeed"
	"github.com/nakatanakatana/feed-reader/store"
	"github.com/stretchr/testify/assert"
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
		}

		hasPubDate := rapid.Bool().Draw(t, "hasPubDate")
		if hasPubDate {
			pubDate := time.Unix(rapid.Int64Range(0, 2e9).Draw(t, "pubDate"), 0)
			item.PublishedParsed = &pubDate
		}

		params := s.normalizeItem(feedID, item)

		assert.Equal(t, feedID, params.FeedID)
		assert.Equal(t, item.Link, params.Url)
		assert.Equal(t, item.Title, *params.Title)
		assert.Equal(t, item.Description, *params.Description)
		assert.Equal(t, item.GUID, *params.Guid)

		if hasPubDate {
			assert.NotNil(t, params.PublishedAt)
			assert.Equal(t, item.PublishedParsed.Format(time.RFC3339), *params.PublishedAt)
		} else {
			assert.Nil(t, params.PublishedAt)
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
	items, err := queries.ListItemsByFeed(ctx, feed.ID)
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
	if err != nil {
		t.Fatalf("FetchAllFeeds failed: %v", err)
	}

	// Wait for workers to finish
	pool.Wait()

	// Verify results
	// Recent feed should NOT have changed timestamp (or very minimally if we were unlucky, but we check if it is > recentTime + small delta? No, simpler: check if it was updated to NOW)
	// Actually, if it fetched, it would update timestamp to NOW.
	// So we check if timestamp is close to NOW vs close to recentTime.

	fRecent, _ := queries.GetFeed(ctx, feedRecent.ID)
	if *fRecent.LastFetchedAt != recentTime {
		t.Errorf("Recent feed should not have been fetched. Want %s, got %s", recentTime, *fRecent.LastFetchedAt)
	}

	fOld, _ := queries.GetFeed(ctx, feedOld.ID)
	if *fOld.LastFetchedAt == oldTime {
		t.Error("Old feed should have been fetched and updated")
	}

	fNew, _ := queries.GetFeed(ctx, feedNew.ID)
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
	feed, _ := queries.CreateFeed(ctx, store.CreateFeedParams{ID: "forced", Url: "http://forced"})
	_ = queries.MarkFeedFetched(ctx, store.MarkFeedFetchedParams{ID: feed.ID, LastFetchedAt: &recentTime})

	// Force refresh
	err := service.FetchFeedsByIDs(ctx, []string{feed.ID})
	if err != nil {
		t.Fatalf("FetchFeedsByIDs failed: %v", err)
	}

	pool.Wait()

	// Verify it was fetched (last_fetched_at updated to NOW)
	updatedFeed, _ := queries.GetFeed(ctx, feed.ID)
	if *updatedFeed.LastFetchedAt == recentTime {
		t.Error("Feed should have been force refreshed")
	}
}
