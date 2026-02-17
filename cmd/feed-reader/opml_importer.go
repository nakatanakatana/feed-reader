package main

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"log/slog"
	"sync"

	"github.com/mmcdole/gofeed"
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
	g, gCtx := errgroup.WithContext(ctx)
	g.SetLimit(10) // Limit concurrency for fetching

	type fetchedResult struct {
		opmlFeed    OpmlFeed
		fetchedFeed *gofeed.Feed
		feedID      string
	}
	var successfulFeeds []fetchedResult
	var fetchedURLs sync.Map

	for _, f := range opmlFeeds {
		f := f
		g.Go(func() error {
			// Application-level deduplication
			if _, loaded := fetchedURLs.LoadOrStore(f.URL, true); loaded {
				return nil
			}

			// Deduplication (Database check)
			_, err := i.store.GetFeedByURL(gCtx, f.URL)
			if err == nil {
				mu.Lock()
				results.Skipped++
				mu.Unlock()
				return nil
			}
			if !errors.Is(err, sql.ErrNoRows) {
				i.logger.ErrorContext(gCtx, "db error checking feed existence", "url", f.URL, "error", err)
				mu.Lock()
				results.FailedFeeds = append(results.FailedFeeds, ImportFailedFeed{URL: f.URL, ErrorMessage: "database error checking existence"})
				mu.Unlock()
				return nil
			}

			// Fetch metadata
			fetchedFeed, err := i.fetcher.Fetch(gCtx, "", f.URL)
			if err != nil {
				i.logger.ErrorContext(gCtx, "failed to fetch feed metadata", "url", f.URL, "error", err)
				mu.Lock()
				results.FailedFeeds = append(results.FailedFeeds, ImportFailedFeed{URL: f.URL, ErrorMessage: "failed to fetch feed metadata: " + err.Error()})
				mu.Unlock()
				return nil
			}

			newUUID, err := i.uuidGen.NewRandom()
			if err != nil {
				return fmt.Errorf("failed to generate UUID: %w", err)
			}

			mu.Lock()
			successfulFeeds = append(successfulFeeds, fetchedResult{
				opmlFeed:    f,
				fetchedFeed: fetchedFeed,
				feedID:      newUUID.String(),
			})
			mu.Unlock()
			return nil
		})
	}

	if err := g.Wait(); err != nil {
		return nil, err
	}

	if len(successfulFeeds) == 0 {
		return results, nil
	}

	// Bulk DB operations in a single transaction
	err = i.store.WithTransaction(ctx, func(qtx *store.Queries) error {
		// 1. Handle Tags
		tagNameToID := make(map[string]string)
		for _, sf := range successfulFeeds {
			for _, tagName := range sf.opmlFeed.Tags {
				if _, ok := tagNameToID[tagName]; !ok {
					// Check if tag exists
					tag, err := qtx.GetTagByName(ctx, tagName)
					if err == nil {
						tagNameToID[tagName] = tag.ID
					} else if errors.Is(err, sql.ErrNoRows) {
						newTagUUID, err := i.uuidGen.NewRandom()
						if err != nil {
							return err
						}
						// CreateTag now uses ON CONFLICT DO UPDATE SET name = excluded.name RETURNING *
						// so it will always return the tag (either new or existing)
						tag, err = qtx.CreateTag(ctx, store.CreateTagParams{
							ID:   newTagUUID.String(),
							Name: tagName,
						})
						if err != nil {
							return err
						}
						tagNameToID[tagName] = tag.ID
					} else {
						return err
					}
				}
			}
		}

		// 2. Create Feeds and collect FeedTag associations
		var feedTagsToCreate []store.CreateFeedTagParams
		for _, sf := range successfulFeeds {
			strPtr := func(s string) *string {
				if s == "" {
					return nil
				}
				return &s
			}
			var imageUrl *string
			if sf.fetchedFeed.Image != nil {
				imageUrl = strPtr(sf.fetchedFeed.Image.URL)
			}
			title := sf.fetchedFeed.Title
			if sf.opmlFeed.Title != "" {
				title = sf.opmlFeed.Title
			}

			_, err := qtx.CreateFeed(ctx, store.CreateFeedParams{
				ID:          sf.feedID,
				Url:         sf.opmlFeed.URL,
				Title:       strPtr(title),
				Description: strPtr(sf.fetchedFeed.Description),
				Link:        strPtr(sf.fetchedFeed.Link),
				Lang:        strPtr(sf.fetchedFeed.Language),
				ImageUrl:    imageUrl,
				Copyright:   strPtr(sf.fetchedFeed.Copyright),
				FeedType:    strPtr(sf.fetchedFeed.FeedType),
				FeedVersion: strPtr(sf.fetchedFeed.FeedVersion),
			})
			if err != nil {
				return err
			}

			// Prepare Feed-Tag associations
			seenInFeed := make(map[string]struct{})
			for _, tagName := range sf.opmlFeed.Tags {
				tagID := tagNameToID[tagName]
				if _, ok := seenInFeed[tagID]; !ok {
					seenInFeed[tagID] = struct{}{}
					feedTagsToCreate = append(feedTagsToCreate, store.CreateFeedTagParams{
						FeedID: sf.feedID,
						TagID:  tagID,
					})
				}
			}
		}

		// 3. Create FeedTag associations
		for _, ft := range feedTagsToCreate {
			if err := qtx.CreateFeedTag(ctx, ft); err != nil {
				return err
			}
		}

		return nil
	})

	if err != nil {
		i.logger.ErrorContext(ctx, "bulk import transaction failed", "error", err)
		return nil, fmt.Errorf("bulk import failed: %w", err)
	}

	results.Success = int32(len(successfulFeeds))
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
