package main

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"log/slog"
	"sync"

	"github.com/nakatanakatana/feed-reader/store"
	"golang.org/x/sync/errgroup"
)

type ImportFailedFeed struct {
	URL          string
	ErrorMessage string
}

type ImportResults struct {
	Total       int32
	Success     int32
	Skipped     int32
	FailedFeeds []ImportFailedFeed
}

func (i *OPMLImporter) ImportSync(ctx context.Context, opmlContent []byte) (*ImportResults, error) {
	opmlFeeds, err := ParseOPML(opmlContent)
	if err != nil {
		return nil, fmt.Errorf("failed to parse OPML: %w", err)
	}

	results := &ImportResults{
		Total: int32(len(opmlFeeds)),
	}

	var mu sync.Mutex
	g, ctx := errgroup.WithContext(ctx)
	g.SetLimit(10) // Limit concurrency to avoid overwhelming resources

	for _, f := range opmlFeeds {
		f := f // capture variable
		g.Go(func() error {
			// Deduplication
			_, err := i.store.GetFeedByURL(ctx, f.URL)
			if err == nil {
				// Already exists
				mu.Lock()
				results.Skipped++
				mu.Unlock()
				return nil
			}
			if !errors.Is(err, sql.ErrNoRows) {
				i.logger.ErrorContext(ctx, "db error checking feed existence", "url", f.URL, "error", err)
				mu.Lock()
				results.FailedFeeds = append(results.FailedFeeds, ImportFailedFeed{URL: f.URL, ErrorMessage: "database error checking existence"})
				mu.Unlock()
				return nil
			}

			// Fetch metadata
			fetchedFeed, err := i.fetcher.Fetch(ctx, "", f.URL)
			if err != nil {
				i.logger.ErrorContext(ctx, "failed to fetch feed metadata", "url", f.URL, "error", err)
				mu.Lock()
				results.FailedFeeds = append(results.FailedFeeds, ImportFailedFeed{URL: f.URL, ErrorMessage: "failed to fetch feed metadata: " + err.Error()})
				mu.Unlock()
				return nil
			}

			newUUID, err := i.uuidGen.NewRandom()
			if err != nil {
				return fmt.Errorf("failed to generate UUID: %w", err)
			}
			feedID := newUUID.String()

			strPtr := func(s string) *string {
				if s == "" {
					return nil
				}
				return &s
			}

			var imageUrl *string
			if fetchedFeed.Image != nil {
				imageUrl = strPtr(fetchedFeed.Image.URL)
			}

			title := fetchedFeed.Title
			if f.Title != "" {
				title = f.Title
			}

			// Note: CreateFeed and tag operations are still one-by-one here.
			// Bulk insertion will be addressed in Phase 3.
			_, err = i.store.CreateFeed(ctx, store.CreateFeedParams{
				ID:          feedID,
				Url:         f.URL,
				Title:       strPtr(title),
				Description: strPtr(fetchedFeed.Description),
				Link:        strPtr(fetchedFeed.Link),
				Lang:        strPtr(fetchedFeed.Language),
				ImageUrl:    imageUrl,
				Copyright:   strPtr(fetchedFeed.Copyright),
				FeedType:    strPtr(fetchedFeed.FeedType),
				FeedVersion: strPtr(fetchedFeed.FeedVersion),
			})
			if err != nil {
				i.logger.ErrorContext(ctx, "failed to create feed in db", "url", f.URL, "error", err)
				mu.Lock()
				results.FailedFeeds = append(results.FailedFeeds, ImportFailedFeed{URL: f.URL, ErrorMessage: "failed to create feed in database"})
				mu.Unlock()
				return nil
			}

			// Persist tags
			tagsFailed := false
			if len(f.Tags) > 0 {
				var tagIDs []string
				seenTagIDs := make(map[string]struct{})
				for _, tagName := range f.Tags {
					tag, err := i.store.GetOrCreateTag(ctx, tagName, i.uuidGen)
					if err != nil {
						i.logger.ErrorContext(ctx, "failed to get or create tag", "tag", tagName, "error", err)
						tagsFailed = true
						break
					}
					if _, ok := seenTagIDs[tag.ID]; !ok {
						seenTagIDs[tag.ID] = struct{}{}
						tagIDs = append(tagIDs, tag.ID)
					}
				}
				if !tagsFailed && len(tagIDs) > 0 {
					if err := i.store.SetFeedTags(ctx, feedID, tagIDs); err != nil {
						i.logger.ErrorContext(ctx, "failed to set feed tags", "feedID", feedID, "error", err)
						tagsFailed = true
					}
				}
			}

			mu.Lock()
			defer mu.Unlock()
			if tagsFailed {
				results.FailedFeeds = append(results.FailedFeeds, ImportFailedFeed{
					URL:          f.URL,
					ErrorMessage: "failed to persist tags for feed",
				})
			} else {
				results.Success++
			}
			return nil
		})
	}

	if err := g.Wait(); err != nil {
		return nil, err
	}

	return results, nil
}

type OPMLImporter struct {
	store   *store.Store
	fetcher FeedFetcher
	logger  *slog.Logger
	uuidGen UUIDGenerator
}

func NewOPMLImporter(s *store.Store, f FeedFetcher, l *slog.Logger, uuidGen UUIDGenerator) *OPMLImporter {
	if uuidGen == nil {
		uuidGen = realUUIDGenerator{}
	}
	return &OPMLImporter{
		store:   s,
		fetcher: f,
		logger:  l,
		uuidGen: uuidGen,
	}
}
