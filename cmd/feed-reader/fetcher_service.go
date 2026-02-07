package main

import (
	"context"
	"encoding/json"
	"log/slog"
	"sync"
	"time"

	"github.com/mmcdole/gofeed"
	"github.com/nakatanakatana/feed-reader/store"
)

// FetcherService coordinates the background fetching process.
type FetcherService struct {
	store         *store.Store
	fetcher       FeedFetcher
	pool          *WorkerPool
	writeQueue    *WriteQueueService
	logger        *slog.Logger
	fetchInterval time.Duration
	fetching      sync.Map // feedID -> struct{}{}
}

// NewFetcherService creates a new FetcherService.
func NewFetcherService(s *store.Store, f FeedFetcher, p *WorkerPool, wq *WriteQueueService, l *slog.Logger, fetchInterval time.Duration) *FetcherService {
	return &FetcherService{
		store:         s,
		fetcher:       f,
		pool:          p,
		writeQueue:    wq,
		logger:        l,
		fetchInterval: fetchInterval,
	}
}

type FeedFetchResult struct {
	FeedID        string
	Success       bool
	NewItemsCount int32
	ErrorMessage  string
}

// FetchFeedsByIDsSync initiates the fetching process for specified feeds and waits for completion.
func (s *FetcherService) FetchFeedsByIDsSync(ctx context.Context, ids []string) ([]FeedFetchResult, error) {
	s.logger.InfoContext(ctx, "starting synchronous fetch for feeds", "count", len(ids))

	feeds, err := s.store.ListFeedsByIDs(ctx, ids)
	if err != nil {
		s.logger.ErrorContext(ctx, "failed to list feeds by ids", "error", err)
		return nil, err
	}

	results := make([]FeedFetchResult, len(feeds))
	var wg sync.WaitGroup

	for i, feed := range feeds {
		wg.Add(1)
		go func(idx int, f store.Feed) {
			defer wg.Done()

			// Check if already fetching
			if _, loaded := s.fetching.LoadOrStore(f.ID, struct{}{}); loaded {
				results[idx] = FeedFetchResult{
					FeedID:       f.ID,
					Success:      false,
					ErrorMessage: "fetch already in progress",
				}
				return
			}
			defer s.fetching.Delete(f.ID)

			result, err := s.fetchAndSaveSync(ctx, f)
			if err != nil {
				results[idx] = FeedFetchResult{
					FeedID:       f.ID,
					Success:      false,
					ErrorMessage: err.Error(),
				}
			} else {
				results[idx] = *result
			}
		}(i, feed)
	}

	wg.Wait()
	return results, nil
}

func (s *FetcherService) fetchAndSaveSync(ctx context.Context, f store.Feed) (*FeedFetchResult, error) {
	s.logger.DebugContext(ctx, "fetching feed sync", "url", f.Url, "id", f.ID)

	parsedFeed, err := s.fetcher.Fetch(ctx, f.ID, f.Url)
	if err != nil {
		s.logger.ErrorContext(ctx, "failed to fetch feed sync", "url", f.Url, "error", err)
		return nil, err
	}

	result := &FeedFetchResult{
		FeedID:  f.ID,
		Success: true,
	}

	if len(parsedFeed.Items) > 0 {
		resChan := make(chan SaveItemsResult, 1)
		job := &SaveItemsJob{
			Items:      make([]store.SaveFetchedItemParams, 0, len(parsedFeed.Items)),
			ResultChan: resChan,
		}
		for _, item := range parsedFeed.Items {
			job.Items = append(job.Items, s.normalizeItem(f.ID, item))
		}
		s.writeQueue.Submit(job)

		select {
		case res := <-resChan:
			if res.Error != nil {
				return nil, res.Error
			}
			result.NewItemsCount = res.NewItemsCount
		case <-ctx.Done():
			return nil, ctx.Err()
		}
	}

	// Update last_fetched_at
	now := time.Now().Format(time.RFC3339)
	s.writeQueue.Submit(&MarkFetchedJob{
		Params: store.MarkFeedFetchedParams{
			LastFetchedAt: &now,
			ID:            f.ID,
		},
	})

	return result, nil
}

// FetchAllFeeds initiates the fetching process for all registered feeds.
func (s *FetcherService) FetchAllFeeds(ctx context.Context) error {
	s.logger.InfoContext(ctx, "starting background fetch for all feeds")

	feeds, err := s.store.ListFeeds(ctx, store.ListFeedsParams{})
	if err != nil {
		s.logger.ErrorContext(ctx, "failed to list feeds", "error", err)
		return err
	}

	for _, feed := range feeds {
		if !s.shouldFetch(feed) {
			continue
		}

		f := feed // capture loop variable
		s.pool.AddTask(func(ctx context.Context) error {
			return s.FetchAndSave(ctx, f)
		})
	}

	return nil
}

// FetchFeedsByIDs initiates the fetching process for specified feeds, bypassing the interval check.
func (s *FetcherService) FetchFeedsByIDs(ctx context.Context, ids []string) error {
	s.logger.InfoContext(ctx, "starting forced fetch for feeds", "count", len(ids))

	feeds, err := s.store.ListFeedsByIDs(ctx, ids)
	if err != nil {
		s.logger.ErrorContext(ctx, "failed to list feeds by ids", "error", err)
		return err
	}

	for _, feed := range feeds {
		f := feed // capture loop variable
		s.pool.AddTask(func(ctx context.Context) error {
			return s.FetchAndSave(ctx, f)
		})
	}

	return nil
}

func (s *FetcherService) shouldFetch(f store.Feed) bool {
	if f.LastFetchedAt == nil {
		return true
	}

	lastFetched, err := time.Parse(time.RFC3339, *f.LastFetchedAt)
	if err != nil {
		s.logger.Warn("failed to parse last_fetched_at", "id", f.ID, "error", err)
		return true // Fetch if date is invalid
	}

	return time.Since(lastFetched) >= s.fetchInterval
}

func (s *FetcherService) FetchAndSave(ctx context.Context, f store.Feed) error {
	s.logger.InfoContext(ctx, "fetching feed", "url", f.Url, "id", f.ID)

	if _, loaded := s.fetching.LoadOrStore(f.ID, struct{}{}); loaded {
		s.logger.DebugContext(ctx, "fetch already in progress, skipping", "url", f.Url, "id", f.ID)
		return nil
	}
	defer s.fetching.Delete(f.ID)

	parsedFeed, err := s.fetcher.Fetch(ctx, f.ID, f.Url)
	if err != nil {
		s.logger.ErrorContext(ctx, "failed to fetch feed", "url", f.Url, "error", err)
		return err
	}

	if len(parsedFeed.Items) > 0 {
		job := &SaveItemsJob{
			Items: make([]store.SaveFetchedItemParams, 0, len(parsedFeed.Items)),
		}
		for _, item := range parsedFeed.Items {
			job.Items = append(job.Items, s.normalizeItem(f.ID, item))
		}
		s.writeQueue.Submit(job)
	}

	// Update last_fetched_at asynchronously
	now := time.Now().Format(time.RFC3339)
	s.writeQueue.Submit(&MarkFetchedJob{
		Params: store.MarkFeedFetchedParams{
			LastFetchedAt: &now,
			ID:            f.ID,
		},
	})

	s.logger.DebugContext(ctx, "enqueued updates for feed", "url", f.Url, "items", len(parsedFeed.Items))
	return nil
}

func (s *FetcherService) normalizeItem(feedID string, item *gofeed.Item) store.SaveFetchedItemParams {
	params := store.SaveFetchedItemParams{
		FeedID:      feedID,
		Url:         item.Link,
		Title:       &item.Title,
		Description: &item.Description,
		Guid:        &item.GUID,
		Content:     &item.Content,
	}
	if item.PublishedParsed != nil {
		pubAt := item.PublishedParsed.Format(time.RFC3339)
		params.PublishedAt = &pubAt
	}

	if item.Image != nil {
		params.ImageUrl = &item.Image.URL
	}

	if len(item.Categories) > 0 {
		// Simple JSON encoding
		// We ignore error here as []string should always be encodable
		if b, err := json.Marshal(item.Categories); err == nil {
			cat := string(b)
			params.Categories = &cat
		}
	}

	return params
}
