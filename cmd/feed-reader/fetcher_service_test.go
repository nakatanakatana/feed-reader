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
	service := NewFetcherService(s, fetcher, nil, logger)

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
