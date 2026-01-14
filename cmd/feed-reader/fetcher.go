package main

import (
	"context"
	"net/http"
	"time"

	"github.com/hashicorp/go-retryablehttp"
	"github.com/mmcdole/gofeed"
)

// FeedFetcher defines the interface for fetching RSS/Atom feeds.
type FeedFetcher interface {
	Fetch(ctx context.Context, url string) (*gofeed.Feed, error)
}

// GofeedFetcher is the implementation of FeedFetcher using the gofeed library.
type GofeedFetcher struct {
	client *http.Client
}

// NewGofeedFetcher creates a new GofeedFetcher.
func NewGofeedFetcher() *GofeedFetcher {
	retryClient := retryablehttp.NewClient()
	retryClient.RetryMax = 3
	retryClient.RetryWaitMin = 1 * time.Second
	retryClient.RetryWaitMax = 5 * time.Second
	retryClient.Logger = nil // Disable verbose logging by default

	return &GofeedFetcher{
		client: retryClient.StandardClient(),
	}
}

// Fetch fetches the feed from the given URL.
func (f *GofeedFetcher) Fetch(ctx context.Context, url string) (*gofeed.Feed, error) {
	fp := gofeed.NewParser()
	fp.Client = f.client
	return fp.ParseURLWithContext(url, ctx)
}