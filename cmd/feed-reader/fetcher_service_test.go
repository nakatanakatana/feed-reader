package main

import (
	"bytes"
	"context"
	"fmt"
	"log/slog"
	"sync"
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
	service := NewFetcherService(s, fetcher, nil, wq, logger, 30*time.Minute)

	err = service.FetchAndSave(ctx, store.FullFeed{
		ID:  feed.ID,
		Url: feed.Url,
	})
	assert.NilError(t, err)

	// Wait for WriteQueue to process jobs
	time.Sleep(100 * time.Millisecond)

	// Verify items are saved
	items, err := s.ListItems(ctx, store.StoreListItemsParams{
		FeedID:    feed.ID,
		Limit:     10,
		IsBlocked: false,
	})
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
	service := NewFetcherService(s, fetcher, pool, wq, logger, interval)

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
	service := NewFetcherService(s, fetcher, pool, wq, logger, interval)

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
	service := NewFetcherService(s, fetcher, nil, wq, logger, 30*time.Minute)

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
	service := NewFetcherService(s, fetcher, nil, wq, logger, defaultInterval)

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

func TestFetcherService_PeakAwareInterval(t *testing.T) {
	ctx := context.Background()
	queries, db := setupTestDB(t)
	s := store.NewStore(db)

	logger := slog.New(slog.NewJSONHandler(&bytes.Buffer{}, nil))
	defaultInterval := 1 * time.Hour
	wq := NewWriteQueueService(s, WriteQueueConfig{MaxBatchSize: 1, FlushInterval: 10 * time.Millisecond}, logger)
	go wq.Start(ctx)
	fetcher := &mockFetcher{feed: &gofeed.Feed{}}
	service := NewFetcherService(s, fetcher, nil, wq, logger, defaultInterval)

	t.Run("peak adjustment", func(t *testing.T) {
		feed, _ := queries.CreateFeed(ctx, store.CreateFeedParams{ID: "peaky", Url: "http://peaky"})

		// Current time
		now := time.Now().UTC()
		// We want nextFetchTime (now + baseInterval) to fall into a peak bucket.
		// baseInterval will be 24h because we have items 7 days apart.
		peakTime := now.Add(24 * time.Hour)

		// Create a peak distribution for peakTime (DOW and Hour)
		// Item 1: 7 days ago, same DOW and Hour as peakTime
		pub1 := peakTime.Add(-7 * 24 * time.Hour).Format(time.RFC3339)
		err := s.SaveFetchedItem(ctx, store.SaveFetchedItemParams{
			FeedID:      feed.ID,
			Url:         "http://peaky/1",
			PublishedAt: &pub1,
		})
		assert.NilError(t, err)

		// Item 2: 14 days ago, same DOW and Hour as peakTime
		pub2 := peakTime.Add(-14 * 24 * time.Hour).Format(time.RFC3339)
		err = s.SaveFetchedItem(ctx, store.SaveFetchedItemParams{
			FeedID:      feed.ID,
			Url:         "http://peaky/2",
			PublishedAt: &pub2,
		})
		assert.NilError(t, err)

		// Wait for WriteQueue
		time.Sleep(100 * time.Millisecond)

		// Trigger FetchAndSave
		err = service.FetchAndSave(ctx, store.FullFeed{ID: feed.ID, Url: feed.Url})
		assert.NilError(t, err)
		time.Sleep(100 * time.Millisecond)

		updated, _ := queries.GetFeed(ctx, feed.ID)
		nextFetch, _ := time.Parse(time.RFC3339, *updated.NextFetch)
		lastFetched, _ := time.Parse(time.RFC3339, *updated.LastFetchedAt)
		diff := nextFetch.Sub(lastFetched)

		// baseInterval = 24h (capped).
		// peakTime = now + 24h falls into the bucket with 2 items.
		// Peak adjustment should halve it to 12h.

		assert.Assert(t, diff >= 11*time.Hour && diff <= 13*time.Hour, "Expected ~12h interval (peak adjusted), got %v", diff)
	})
}

type trackingFetcher struct {
	mu      sync.Mutex
	fetched []string
	feed    *gofeed.Feed
}

func (f *trackingFetcher) Fetch(ctx context.Context, feedID string, url string) (*gofeed.Feed, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	f.fetched = append(f.fetched, feedID)
	if f.feed == nil {
		return &gofeed.Feed{}, nil
	}
	return f.feed, nil
}

func (f *trackingFetcher) WasFetched(feedID string) bool {
	f.mu.Lock()
	defer f.mu.Unlock()
	for _, id := range f.fetched {
		if id == feedID {
			return true
		}
	}
	return false
}

func TestFetcherService_MarkFetched_IgnoreWindows(t *testing.T) {
	ctx := context.Background()

	t.Run("directly attached ignore window", func(t *testing.T) {
		queries, db := setupTestDB(t)
		s := store.NewStore(db)
		logger := slog.New(slog.NewJSONHandler(&bytes.Buffer{}, nil))
		wq := NewWriteQueueService(s, WriteQueueConfig{MaxBatchSize: 1, FlushInterval: 10 * time.Millisecond}, logger)
		go wq.Start(ctx)
		service := NewFetcherService(s, &mockFetcher{}, nil, wq, logger, 30*time.Minute)

		feed, err := queries.CreateFeed(ctx, store.CreateFeedParams{ID: "feed-direct-iw", Url: "http://direct-iw"})
		assert.NilError(t, err)

		now := time.Now().UTC()
		todayWeekday := int(now.Weekday())
		iw, err := queries.CreateIgnoreWindow(ctx, store.CreateIgnoreWindowParams{
			ID:         "iw-direct",
			Name:       "Today Direct Blackout",
			StartTime:  "00:00",
			EndTime:    "24:00",
			DaysOfWeek: fmt.Sprintf("[%d]", todayWeekday),
			Timezone:   "UTC",
		})
		assert.NilError(t, err)

		err = queries.CreateFeedIgnoreWindow(ctx, store.CreateFeedIgnoreWindowParams{
			FeedID:         feed.ID,
			IgnoreWindowID: iw.ID,
		})
		assert.NilError(t, err)

		service.markFetched(ctx, feed.ID, nil)
		time.Sleep(100 * time.Millisecond)

		updated, err := queries.GetFeed(ctx, feed.ID)
		assert.NilError(t, err)
		assert.Assert(t, updated.NextFetch != nil)

		nextFetch, err := time.Parse(time.RFC3339, *updated.NextFetch)
		assert.NilError(t, err)

		expectedEnd := time.Date(now.Year(), now.Month(), now.Day()+1, 0, 0, 0, 0, time.UTC)
		assert.Equal(t, nextFetch.Unix(), expectedEnd.Unix(), "next_fetch should be adjusted to end of ignore window")
	})

	t.Run("tag attached ignore window", func(t *testing.T) {
		queries, db := setupTestDB(t)
		s := store.NewStore(db)
		logger := slog.New(slog.NewJSONHandler(&bytes.Buffer{}, nil))
		wq := NewWriteQueueService(s, WriteQueueConfig{MaxBatchSize: 1, FlushInterval: 10 * time.Millisecond}, logger)
		go wq.Start(ctx)
		service := NewFetcherService(s, &mockFetcher{}, nil, wq, logger, 30*time.Minute)

		feed, err := queries.CreateFeed(ctx, store.CreateFeedParams{ID: "feed-tag-iw", Url: "http://tag-iw"})
		assert.NilError(t, err)

		tag, err := queries.CreateTag(ctx, store.CreateTagParams{
			ID:   "tag-1",
			Name: "blackout-tag",
		})
		assert.NilError(t, err)

		err = queries.CreateFeedTag(ctx, store.CreateFeedTagParams{
			FeedID: feed.ID,
			TagID:  tag.ID,
		})
		assert.NilError(t, err)

		now := time.Now().UTC()
		todayWeekday := int(now.Weekday())
		iw, err := queries.CreateIgnoreWindow(ctx, store.CreateIgnoreWindowParams{
			ID:         "iw-tag",
			Name:       "Today Tag Blackout",
			StartTime:  "00:00",
			EndTime:    "24:00",
			DaysOfWeek: fmt.Sprintf("[%d]", todayWeekday),
			Timezone:   "UTC",
		})
		assert.NilError(t, err)

		err = queries.CreateTagIgnoreWindow(ctx, store.CreateTagIgnoreWindowParams{
			TagID:          tag.ID,
			IgnoreWindowID: iw.ID,
		})
		assert.NilError(t, err)

		service.markFetched(ctx, feed.ID, nil)
		time.Sleep(100 * time.Millisecond)

		updated, err := queries.GetFeed(ctx, feed.ID)
		assert.NilError(t, err)
		assert.Assert(t, updated.NextFetch != nil)

		nextFetch, err := time.Parse(time.RFC3339, *updated.NextFetch)
		assert.NilError(t, err)

		expectedEnd := time.Date(now.Year(), now.Month(), now.Day()+1, 0, 0, 0, 0, time.UTC)
		assert.Equal(t, nextFetch.Unix(), expectedEnd.Unix(), "next_fetch should be adjusted to end of tag ignore window")
	})
}

func TestFetcherService_FetchAllFeeds_IgnoreWindow(t *testing.T) {
	ctx := context.Background()
	queries, db := setupTestDB(t)
	s := store.NewStore(db)

	fetcher := &trackingFetcher{feed: &gofeed.Feed{Title: "Tracking"}}
	pool := NewWorkerPool(2)
	pool.Start(ctx)

	logger := slog.New(slog.NewJSONHandler(&bytes.Buffer{}, nil))
	wq := NewWriteQueueService(s, WriteQueueConfig{MaxBatchSize: 1, FlushInterval: 10 * time.Millisecond}, logger)
	go wq.Start(ctx)
	service := NewFetcherService(s, fetcher, pool, wq, logger, 30*time.Minute)

	now := time.Now().UTC()
	pastTime := now.Add(-1 * time.Hour).Format(time.RFC3339)

	// Feed 1: in active ignore window
	feedBlocked, err := queries.CreateFeed(ctx, store.CreateFeedParams{ID: "feed-blocked", Url: "http://blocked"})
	assert.NilError(t, err)
	_ = queries.MarkFeedFetched(ctx, store.MarkFeedFetchedParams{FeedID: feedBlocked.ID, NextFetch: &pastTime})

	todayWeekday := int(now.Weekday())
	iw, err := queries.CreateIgnoreWindow(ctx, store.CreateIgnoreWindowParams{
		ID:         "iw-active-now",
		Name:       "Active Now Blackout",
		StartTime:  "00:00",
		EndTime:    "24:00",
		DaysOfWeek: fmt.Sprintf("[%d]", todayWeekday),
		Timezone:   "UTC",
	})
	assert.NilError(t, err)

	err = queries.CreateFeedIgnoreWindow(ctx, store.CreateFeedIgnoreWindowParams{
		FeedID:         feedBlocked.ID,
		IgnoreWindowID: iw.ID,
	})
	assert.NilError(t, err)

	// Feed 2: normal feed (no ignore window)
	feedNormal, err := queries.CreateFeed(ctx, store.CreateFeedParams{ID: "feed-normal", Url: "http://normal"})
	assert.NilError(t, err)
	_ = queries.MarkFeedFetched(ctx, store.MarkFeedFetchedParams{FeedID: feedNormal.ID, NextFetch: &pastTime})

	err = service.FetchAllFeeds(ctx)
	assert.NilError(t, err)

	pool.Wait()
	time.Sleep(150 * time.Millisecond)

	// Verify normal feed was fetched
	assert.Assert(t, fetcher.WasFetched(feedNormal.ID), "Normal feed should have been fetched")
	fNorm, _ := queries.GetFeed(ctx, feedNormal.ID)
	assert.Assert(t, fNorm.LastFetchedAt != nil)

	// Verify blocked feed was NOT fetched
	assert.Assert(t, !fetcher.WasFetched(feedBlocked.ID), "Feed in active ignore window should NOT be fetched")
	fBlock, _ := queries.GetFeed(ctx, feedBlocked.ID)
	assert.Assert(t, fBlock.LastFetchedAt == nil, "Feed in active ignore window should not update LastFetchedAt")
	assert.Assert(t, fBlock.NextFetch != nil)

	expectedEnd := time.Date(now.Year(), now.Month(), now.Day()+1, 0, 0, 0, 0, time.UTC)
	nextFetch, err := time.Parse(time.RFC3339, *fBlock.NextFetch)
	assert.NilError(t, err)
	assert.Equal(t, nextFetch.Unix(), expectedEnd.Unix(), "Blocked feed next_fetch should be updated to end of ignore window")
}

func TestFetcherService_FetchFeedsByIDsSync_IgnoreWindow(t *testing.T) {
	ctx := context.Background()
	queries, db := setupTestDB(t)
	s := store.NewStore(db)

	mockFeed := &gofeed.Feed{
		Items: []*gofeed.Item{
			{Title: "Manual Item", Link: "http://manual-item"},
		},
	}
	fetcher := &trackingFetcher{feed: mockFeed}
	logger := slog.New(slog.NewJSONHandler(&bytes.Buffer{}, nil))
	wq := NewWriteQueueService(s, WriteQueueConfig{MaxBatchSize: 1, FlushInterval: 10 * time.Millisecond}, logger)
	go wq.Start(ctx)
	service := NewFetcherService(s, fetcher, nil, wq, logger, 30*time.Minute)

	feed, err := queries.CreateFeed(ctx, store.CreateFeedParams{ID: "feed-manual-sync", Url: "http://manual-sync"})
	assert.NilError(t, err)

	now := time.Now().UTC()
	todayWeekday := int(now.Weekday())
	iw, err := queries.CreateIgnoreWindow(ctx, store.CreateIgnoreWindowParams{
		ID:         "iw-manual",
		Name:       "Manual Ignore Window",
		StartTime:  "00:00",
		EndTime:    "24:00",
		DaysOfWeek: fmt.Sprintf("[%d]", todayWeekday),
		Timezone:   "UTC",
	})
	assert.NilError(t, err)

	err = queries.CreateFeedIgnoreWindow(ctx, store.CreateFeedIgnoreWindowParams{
		FeedID:         feed.ID,
		IgnoreWindowID: iw.ID,
	})
	assert.NilError(t, err)

	// Manual sync refresh should bypass active ignore window
	results, err := service.FetchFeedsByIDsSync(ctx, []string{feed.ID})
	assert.NilError(t, err)
	assert.Equal(t, len(results), 1)
	assert.Assert(t, results[0].Success)
	assert.Assert(t, fetcher.WasFetched(feed.ID), "Manual sync fetch should execute immediately even in ignore window")

	time.Sleep(100 * time.Millisecond)

	updated, err := queries.GetFeed(ctx, feed.ID)
	assert.NilError(t, err)
	assert.Assert(t, updated.LastFetchedAt != nil, "LastFetchedAt should be set on manual refresh")
	assert.Assert(t, updated.NextFetch != nil)

	expectedEnd := time.Date(now.Year(), now.Month(), now.Day()+1, 0, 0, 0, 0, time.UTC)
	nextFetch, err := time.Parse(time.RFC3339, *updated.NextFetch)
	assert.NilError(t, err)
	assert.Equal(t, nextFetch.Unix(), expectedEnd.Unix(), "NextFetch should be adjusted to end of ignore window")
}
