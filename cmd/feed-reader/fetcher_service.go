package main

import (
	"context"
	"log/slog"
	"time"

	"github.com/nakatanakatana/feed-reader/store"
)

// FetcherService coordinates the background fetching process.
type FetcherService struct {
	store   *store.Store
	fetcher FeedFetcher
	pool    *WorkerPool
	logger  *slog.Logger
}

// NewFetcherService creates a new FetcherService.
func NewFetcherService(s *store.Store, f FeedFetcher, p *WorkerPool, l *slog.Logger) *FetcherService {
	return &FetcherService{
		store:   s,
		fetcher: f,
		pool:    p,
		logger:  l,
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
		f := feed // capture loop variable
		s.pool.AddTask(func(ctx context.Context) error {
			return s.FetchAndSave(ctx, f)
		})
	}

	return nil
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

	s.logger.InfoContext(ctx, "successfully fetched and updated feed", "url", f.Url, "items", len(parsedFeed.Items))
	return nil
}
