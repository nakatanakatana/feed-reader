package main

import (
	"context"

	"github.com/mmcdole/gofeed"
)

// FeedFetcher defines the interface for fetching RSS/Atom feeds.
type FeedFetcher interface {
	Fetch(ctx context.Context, url string) (*gofeed.Feed, error)
}

// GofeedFetcher is the implementation of FeedFetcher using the gofeed library.
type GofeedFetcher struct {
	// We might add retryablehttp client here later
}

// NewGofeedFetcher creates a new GofeedFetcher.
func NewGofeedFetcher() *GofeedFetcher {
	return &GofeedFetcher{}
}

// Fetch fetches the feed from the given URL.
func (f *GofeedFetcher) Fetch(ctx context.Context, url string) (*gofeed.Feed, error) {
	// Implementation will come in Green phase
	return nil, nil
}
