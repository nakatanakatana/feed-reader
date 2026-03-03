package main

import (
	"bytes"
	"errors"
	"log/slog"
	"testing"
	"time"

	"github.com/nakatanakatana/feed-reader/store"
	"gotest.tools/v3/assert"
)

func TestFetcherService_FetchFeedsByIDsSync_NotModified(t *testing.T) {
	ctx := t.Context()
	queries, db := setupTestDB(t)
	s := store.NewStore(db)

	logger := slog.New(slog.NewJSONHandler(&bytes.Buffer{}, nil))
	wq := NewWriteQueueService(s, WriteQueueConfig{MaxBatchSize: 1, FlushInterval: 10 * time.Millisecond}, logger)
	go wq.Start(ctx)
	t.Cleanup(wq.Stop)

	// mockFetcher that returns ErrNotModified
	fetcher := &mockFetcher{err: ErrNotModified}
	service := NewFetcherService(s, fetcher, nil, wq, logger, 30*time.Minute)

	feed, _ := queries.CreateFeed(ctx, store.CreateFeedParams{ID: "not-modified-feed", Url: "http://not-modified"})

	// Record initial last_fetched_at
	initialFeed, _ := queries.GetFeed(ctx, feed.ID)
	initialLastFetched := initialFeed.LastFetchedAt

	// Manual sync fetch
	results, err := service.FetchFeedsByIDsSync(ctx, []string{feed.ID})
	assert.NilError(t, err)
	assert.Equal(t, len(results), 1)
	assert.Equal(t, results[0].FeedID, feed.ID)
	assert.Assert(t, results[0].Success)

	// Wait for WriteQueue to process the status update by polling until last_fetched_at changes
	deadline := time.Now().Add(2 * time.Second)
	var updatedFeed store.GetFeedRow
	for {
		updatedFeed, _ = queries.GetFeed(ctx, feed.ID)
		if updatedFeed.LastFetchedAt != nil {
			if initialLastFetched == nil || *updatedFeed.LastFetchedAt != *initialLastFetched {
				break
			}
		}
		if time.Now().After(deadline) {
			t.Fatal("timed out waiting for last_fetched_at update")
		}
		time.Sleep(10 * time.Millisecond)
	}

	// Compare values, not pointer identities, to ensure the timestamp actually changed.
	assert.Assert(t, updatedFeed.LastFetchedAt != nil, "last_fetched_at should not be nil after fetch")
	if initialLastFetched != nil {
		assert.Assert(t, *updatedFeed.LastFetchedAt != *initialLastFetched, "last_fetched_at should have been updated even on 304 Not Modified")
	}
}

func TestFetcherService_FetchFeedsByIDsSync_Errors(t *testing.T) {
	ctx := t.Context()
	queries, db := setupTestDB(t)
	s := store.NewStore(db)

	logger := slog.New(slog.NewJSONHandler(&bytes.Buffer{}, nil))
	wq := NewWriteQueueService(s, WriteQueueConfig{MaxBatchSize: 1, FlushInterval: 10 * time.Millisecond}, logger)
	go wq.Start(ctx)
	t.Cleanup(wq.Stop)

	t.Run("404 Error", func(t *testing.T) {
		fetcher := &mockFetcher{err: errors.New("404 Not Found")}
		service := NewFetcherService(s, fetcher, nil, wq, logger, 30*time.Minute)

		feed, _ := queries.CreateFeed(ctx, store.CreateFeedParams{ID: "404-feed", Url: "http://404"})

		initialFeed, _ := queries.GetFeed(ctx, feed.ID)
		initialLastFetched := initialFeed.LastFetchedAt

		results, _ := service.FetchFeedsByIDsSync(ctx, []string{feed.ID})
		assert.Equal(t, len(results), 1)
		assert.Assert(t, !results[0].Success)

		// Wait briefly to ensure no update happens
		time.Sleep(200 * time.Millisecond)

		updatedFeed, _ := queries.GetFeed(ctx, feed.ID)
		if initialLastFetched == nil {
			assert.Assert(t, updatedFeed.LastFetchedAt == nil, "last_fetched_at should remain nil on error")
		} else {
			assert.Assert(t, *updatedFeed.LastFetchedAt == *initialLastFetched, "last_fetched_at should NOT have been updated on error")
		}
	})

	t.Run("500 Error", func(t *testing.T) {
		fetcher := &mockFetcher{err: errors.New("500 Internal Server Error")}
		service := NewFetcherService(s, fetcher, nil, wq, logger, 30*time.Minute)

		feed, _ := queries.CreateFeed(ctx, store.CreateFeedParams{ID: "500-feed", Url: "http://500"})

		initialFeed, _ := queries.GetFeed(ctx, feed.ID)
		initialLastFetched := initialFeed.LastFetchedAt

		results, _ := service.FetchFeedsByIDsSync(ctx, []string{feed.ID})
		assert.Equal(t, len(results), 1)
		assert.Assert(t, !results[0].Success)

		// Wait briefly to ensure no update happens
		time.Sleep(200 * time.Millisecond)

		updatedFeed, _ := queries.GetFeed(ctx, feed.ID)
		if initialLastFetched == nil {
			assert.Assert(t, updatedFeed.LastFetchedAt == nil, "last_fetched_at should remain nil on error")
		} else {
			assert.Assert(t, *updatedFeed.LastFetchedAt == *initialLastFetched, "last_fetched_at should NOT have been updated on error")
		}
	})
}
