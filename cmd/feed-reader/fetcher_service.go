package main

import (
	"context"
	"log/slog"
	"time"

	"github.com/nakatanakatana/feed-reader/store"
)

// FetcherService coordinates the background fetching process.
type FetcherService struct {
	store         *store.Store
	fetcher       FeedFetcher
	pool          *WorkerPool
	logger        *slog.Logger
	fetchInterval time.Duration
}

// NewFetcherService creates a new FetcherService.
func NewFetcherService(s *store.Store, f FeedFetcher, p *WorkerPool, l *slog.Logger, fetchInterval time.Duration) *FetcherService {
	return &FetcherService{
		store:         s,
		fetcher:       f,
		pool:          p,
		logger:        l,
		fetchInterval: fetchInterval,
	}
}

// FetchAllFeeds initiates the fetching process for all registered feeds.
func (s *FetcherService) FetchAllFeeds(ctx context.Context) error {
	s.logger.InfoContext(ctx, "starting background fetch for all feeds")

	feeds, err := s.store.ListFeeds(ctx)
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
func (s *FetcherService) FetchFeedsByIDs(ctx context.Context, uuids []string) error {
	s.logger.InfoContext(ctx, "starting forced fetch for feeds", "count", len(uuids))

	feeds, err := s.store.ListFeedsByUUIDs(ctx, uuids)
	if err != nil {
		s.logger.ErrorContext(ctx, "failed to list feeds by uuids", "error", err)
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
		s.logger.Warn("failed to parse last_fetched_at", "uuid", f.Uuid, "error", err)
		return true // Fetch if date is invalid
	}

	return time.Since(lastFetched) >= s.fetchInterval
}

func (s *FetcherService) FetchAndSave(ctx context.Context, f store.Feed) error {
	s.logger.DebugContext(ctx, "fetching feed", "url", f.Url, "uuid", f.Uuid)

	parsedFeed, err := s.fetcher.Fetch(ctx, f.Url)
	if err != nil {
		s.logger.ErrorContext(ctx, "failed to fetch feed", "url", f.Url, "error", err)
		return err
	}

	for _, item := range parsedFeed.Items {
		params := store.SaveFetchedItemParams{
			FeedID:      f.Uuid,
			Url:         item.Link,
			Title:       &item.Title,
			Description: &item.Description,
			Guid:        &item.GUID,
		}
		if item.PublishedParsed != nil {
			pubAt := item.PublishedParsed.Format(time.RFC3339)
			params.PublishedAt = &pubAt
		}

		if err := s.store.SaveFetchedItem(ctx, params); err != nil {
			s.logger.ErrorContext(ctx, "failed to save item", "url", item.Link, "error", err)
			// Continue with next item
			continue
		}
	}

	// Update last_fetched_at
	now := time.Now().Format(time.RFC3339)
	if err := s.store.MarkFeedFetched(ctx, store.MarkFeedFetchedParams{
		LastFetchedAt: &now,
		Uuid:          f.Uuid,
	}); err != nil {
		s.logger.ErrorContext(ctx, "failed to update last_fetched_at", "uuid", f.Uuid, "error", err)
		// Not a critical error, so we don't return it
	}

	s.logger.InfoContext(ctx, "successfully fetched and updated feed", "url", f.Url, "items", len(parsedFeed.Items))
	return nil
}
