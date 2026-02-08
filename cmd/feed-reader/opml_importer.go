package main

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"log/slog"

	"github.com/nakatanakatana/feed-reader/store"
)

type ImportResults struct {
	Total       int32
	Success     int32
	Skipped     int32
	FailedFeeds []string
}

func (i *OPMLImporter) ImportSync(ctx context.Context, opmlContent []byte) (*ImportResults, error) {
	opmlFeeds, err := ParseOPML(opmlContent)
	if err != nil {
		return nil, fmt.Errorf("failed to parse OPML: %w", err)
	}

	results := &ImportResults{
		Total: int32(len(opmlFeeds)),
	}

	for _, f := range opmlFeeds {
		// Deduplication
		_, err := i.store.GetFeedByURL(ctx, f.URL)
		if err == nil {
			// Already exists
			results.Skipped++
			continue
		}
		if !errors.Is(err, sql.ErrNoRows) {
			i.logger.ErrorContext(ctx, "db error checking feed existence", "url", f.URL, "error", err)
			results.FailedFeeds = append(results.FailedFeeds, f.URL)
			continue
		}

		// Fetch metadata
		fetchedFeed, err := i.fetcher.Fetch(ctx, "", f.URL)
		if err != nil {
			i.logger.ErrorContext(ctx, "failed to fetch feed metadata", "url", f.URL, "error", err)
			results.FailedFeeds = append(results.FailedFeeds, f.URL)
			continue
		}

		newUUID, err := i.uuidGen.NewRandom()
		if err != nil {
			return nil, fmt.Errorf("failed to generate UUID: %w", err)
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
			results.FailedFeeds = append(results.FailedFeeds, f.URL)
			continue
		}

		results.Success++
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


