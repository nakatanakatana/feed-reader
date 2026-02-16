package main

import (
	"context"
	"encoding/json"
	"errors"
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

	for i, row := range feeds {
		feed := store.FullFeed(row)
		wg.Add(1)
		go func(idx int, f store.FullFeed) {
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

func (s *FetcherService) fetchAndSaveSync(ctx context.Context, f store.FullFeed) (*FeedFetchResult, error) {
	s.logger.DebugContext(ctx, "fetching feed sync", "url", f.Url, "id", f.ID)

	parsedFeed, err := s.fetcher.Fetch(ctx, f.ID, f.Url)
	if err != nil {
		if errors.Is(err, ErrNotModified) {
			s.logger.InfoContext(ctx, "feed not modified, skipping sync", "url", f.Url, "id", f.ID)
			return &FeedFetchResult{
				FeedID:  f.ID,
				Success: true,
			}, nil
		}
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

	// Update last_fetched_at and next_fetch
	now := time.Now().UTC()
	lastFetched := now.Format(time.RFC3339)
	interval := s.getNextFetchInterval(ctx, f.ID)
	nextFetch := now.Add(interval).Format(time.RFC3339)
	s.writeQueue.Submit(&MarkFetchedJob{
		Params: store.MarkFeedFetchedParams{
			LastFetchedAt: &lastFetched,
			NextFetch:     &nextFetch,
			FeedID:        f.ID,
		},
	})

	return result, nil
}


// FetchAllFeeds initiates the fetching process for feeds that are due to be fetched.
func (s *FetcherService) FetchAllFeeds(ctx context.Context) error {
	s.logger.InfoContext(ctx, "starting background fetch for due feeds")

	feeds, err := s.store.ListFeedsToFetch(ctx)
	if err != nil {
		s.logger.ErrorContext(ctx, "failed to list feeds to fetch", "error", err)
		return err
	}

	for _, row := range feeds {
		feed := store.FullFeed{
			ID:            row.ID,
			Url:           row.Url,
			Link:          row.Link,
			Title:         row.Title,
			Description:   row.Description,
			Lang:          row.Lang,
			ImageUrl:      row.ImageUrl,
			Copyright:     row.Copyright,
			FeedType:      row.FeedType,
			FeedVersion:   row.FeedVersion,
			CreatedAt:     row.CreatedAt,
			UpdatedAt:     row.UpdatedAt,
			LastFetchedAt: row.LastFetchedAt,
			NextFetch:     row.NextFetch,
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

	for _, row := range feeds {
		feed := store.FullFeed(row)
		f := feed // capture loop variable
		s.pool.AddTask(func(ctx context.Context) error {
			return s.FetchAndSave(ctx, f)
		})
	}

	return nil
}

func (s *FetcherService) FetchAndSave(ctx context.Context, f store.FullFeed) error {
	s.logger.InfoContext(ctx, "fetching feed", "url", f.Url, "id", f.ID)

	if _, loaded := s.fetching.LoadOrStore(f.ID, struct{}{}); loaded {
		s.logger.DebugContext(ctx, "fetch already in progress, skipping", "url", f.Url, "id", f.ID)
		return nil
	}
	defer s.fetching.Delete(f.ID)

	parsedFeed, err := s.fetcher.Fetch(ctx, f.ID, f.Url)
	if err != nil {
		if errors.Is(err, ErrNotModified) {
			s.logger.InfoContext(ctx, "feed not modified, skipping", "url", f.Url, "id", f.ID)
			// Still update last_fetched_at and next_fetch to avoid immediate re-fetch
			now := time.Now().UTC()
			lastFetched := now.Format(time.RFC3339)
			interval := s.getNextFetchInterval(ctx, f.ID)
			nextFetch := now.Add(interval).Format(time.RFC3339)
			s.writeQueue.Submit(&MarkFetchedJob{
				Params: store.MarkFeedFetchedParams{
					LastFetchedAt: &lastFetched,
					NextFetch:     &nextFetch,
					FeedID:        f.ID,
				},
			})
			return nil
		}
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

	// Update last_fetched_at and next_fetch asynchronously
	now := time.Now().UTC()
	lastFetched := now.Format(time.RFC3339)
	interval := s.getNextFetchInterval(ctx, f.ID)
	nextFetch := now.Add(interval).Format(time.RFC3339)
	s.writeQueue.Submit(&MarkFetchedJob{
		Params: store.MarkFeedFetchedParams{
			LastFetchedAt: &lastFetched,
			NextFetch:     &nextFetch,
			FeedID:        f.ID,
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

func (s *FetcherService) getNextFetchInterval(ctx context.Context, feedID string) time.Duration {
	pubDates, err := s.store.ListRecentItemPublishedDates(ctx, feedID, 10)
	if err != nil {
		s.logger.WarnContext(ctx, "failed to list recent published dates, using default interval", "feed_id", feedID, "error", err)
		return s.fetchInterval
	}

	return CalculateAdaptiveInterval(pubDates, s.fetchInterval, 15*time.Minute, 24*time.Hour)
}

