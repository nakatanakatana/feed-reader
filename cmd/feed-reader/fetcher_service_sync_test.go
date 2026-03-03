package main

import (
	"bytes"
	"errors"
	"log/slog"
	"sync"
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
	done := make(chan struct{})
	go func() {
		defer close(done)
		wq.Start(ctx)
	}()

	var once sync.Once
	stopAndWait := func() {
		once.Do(func() {
			wq.Stop()
			<-done
		})
	}
	t.Cleanup(stopAndWait)

	// mockFetcher that returns ErrNotModified
	fetcher := &mockFetcher{err: ErrNotModified}
	service := NewFetcherService(s, fetcher, nil, wq, logger, 30*time.Minute)

	feed, err := queries.CreateFeed(ctx, store.CreateFeedParams{ID: "not-modified-feed", Url: "http://not-modified"})
	assert.NilError(t, err)

	// Record initial status
	initialFeed, err := queries.GetFeed(ctx, feed.ID)
	assert.NilError(t, err)
	initialLastFetched := initialFeed.LastFetchedAt
	initialNextFetch := initialFeed.NextFetch

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
		updatedFeed, err = queries.GetFeed(ctx, feed.ID)
		assert.NilError(t, err)
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

	// Also verify next_fetch was updated/recalculated
	assert.Assert(t, updatedFeed.NextFetch != nil, "next_fetch should not be nil after fetch")
	if initialNextFetch != nil {
		assert.Assert(t, *updatedFeed.NextFetch != *initialNextFetch, "next_fetch should have been updated even on 304 Not Modified")
	}
}

func TestFetcherService_FetchFeedsByIDsSync_Errors(t *testing.T) {
	queries, db := setupTestDB(t)
	s := store.NewStore(db)
	logger := slog.New(slog.NewJSONHandler(&bytes.Buffer{}, nil))

	runErrorTest := func(t *testing.T, name string, fetchErr error) {
		t.Run(name, func(t *testing.T) {
			ctx := t.Context()
			// Use a per-subtest WriteQueue that we Stop/flush before asserting
			wq := NewWriteQueueService(s, WriteQueueConfig{MaxBatchSize: 1, FlushInterval: 10 * time.Millisecond}, logger)
			done := make(chan struct{})
			go func() {
				defer close(done)
				wq.Start(ctx)
			}()

			var once sync.Once
			stopAndWait := func() {
				once.Do(func() {
					wq.Stop()
					<-done
				})
			}
			// Ensure it always stops even on assertion failures
			t.Cleanup(stopAndWait)

			fetcher := &mockFetcher{err: fetchErr}
			service := NewFetcherService(s, fetcher, nil, wq, logger, 30*time.Minute)

			feed, err := queries.CreateFeed(ctx, store.CreateFeedParams{ID: name, Url: "http://" + name})
			assert.NilError(t, err)

			initialFeed, err := queries.GetFeed(ctx, feed.ID)
			assert.NilError(t, err)
			initialLastFetched := initialFeed.LastFetchedAt
			initialNextFetch := initialFeed.NextFetch

			results, err := service.FetchFeedsByIDsSync(ctx, []string{feed.ID})
			assert.NilError(t, err)
			assert.Equal(t, len(results), 1)
			assert.Assert(t, !results[0].Success)

			// Explicitly stop and wait for flush to complete before reading DB
			stopAndWait()

			updatedFeed, err := queries.GetFeed(ctx, feed.ID)
			assert.NilError(t, err)

			// Verify last_fetched_at is unchanged
			if initialLastFetched == nil {
				assert.Assert(t, updatedFeed.LastFetchedAt == nil, "last_fetched_at should remain nil on error")
			} else {
				assert.Assert(t, *updatedFeed.LastFetchedAt == *initialLastFetched, "last_fetched_at should NOT have been updated on error")
			}

			// Verify next_fetch is unchanged
			if initialNextFetch == nil {
				assert.Assert(t, updatedFeed.NextFetch == nil, "next_fetch should remain nil on error")
			} else {
				assert.Assert(t, *updatedFeed.NextFetch == *initialNextFetch, "next_fetch should NOT have been updated on error")
			}
		})
	}

	runErrorTest(t, "404 Error", errors.New("404 Not Found"))
	runErrorTest(t, "500 Error", errors.New("500 Internal Server Error"))
}
