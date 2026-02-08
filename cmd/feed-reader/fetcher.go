package main

import (
	"context"
	"fmt"
	"net/http"
	"time"

	"github.com/hashicorp/go-retryablehttp"
	"github.com/mmcdole/gofeed"
	"github.com/nakatanakatana/feed-reader/store"
)

// FeedFetcher defines the interface for fetching RSS/Atom feeds.
type FeedFetcher interface {
	Fetch(ctx context.Context, feedID string, url string) (*gofeed.Feed, error)
}

// GofeedFetcher is the implementation of FeedFetcher using the gofeed library.
type GofeedFetcher struct {
	client *http.Client
	store  *store.Store
}

// NewGofeedFetcher creates a new GofeedFetcher.
func NewGofeedFetcher(s *store.Store) *GofeedFetcher {
	retryClient := retryablehttp.NewClient()
	retryClient.RetryMax = 3
	retryClient.RetryWaitMin = 1 * time.Second
	retryClient.RetryWaitMax = 5 * time.Second
	retryClient.Logger = nil // Disable verbose logging by default

	return &GofeedFetcher{
		client: retryClient.StandardClient(),
		store:  s,
	}
}

// ErrNotModified is returned when the feed has not been modified.
var ErrNotModified = fmt.Errorf("feed not modified")

// Fetch fetches the feed from the given URL.
func (f *GofeedFetcher) Fetch(ctx context.Context, feedID string, url string) (*gofeed.Feed, error) {
	var etag, lastModified string
	if feedID != "" {
		cache, err := f.store.GetFeedFetcherCache(ctx, feedID)
		if err == nil {
			if cache.Etag != nil {
				etag = *cache.Etag
			}
			if cache.LastModified != nil {
				lastModified = *cache.LastModified
			}
		}
	}

	req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
	if err != nil {
		return nil, err
	}

	if etag != "" {
		req.Header.Set("If-None-Match", etag)
	}
	if lastModified != "" {
		req.Header.Set("If-Modified-Since", lastModified)
	}

	resp, err := f.client.Do(req)
	if err != nil {
		if feedID != "" {
			_ = f.store.DeleteFeedFetcherCache(ctx, feedID)
		}
		return nil, err
	}
	defer func() { _ = resp.Body.Close() }()

	if resp.StatusCode == http.StatusNotModified {
		return nil, ErrNotModified
	}

	if resp.StatusCode >= 500 {
		if feedID != "" {
			_ = f.store.DeleteFeedFetcherCache(ctx, feedID)
		}
		return nil, fmt.Errorf("server error: %d", resp.StatusCode)
	}

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return nil, fmt.Errorf("unexpected status code: %d", resp.StatusCode)
	}

	// Update cache info
	if feedID != "" {
		newEtag := resp.Header.Get("ETag")
		newLastModified := resp.Header.Get("Last-Modified")
		if newEtag != "" || newLastModified != "" {
			arg := store.UpsertFeedFetcherCacheParams{
				FeedID: feedID,
			}
			if newEtag != "" {
				arg.Etag = &newEtag
			}
			if newLastModified != "" {
				arg.LastModified = &newLastModified
			}
			_, _ = f.store.UpsertFeedFetcherCache(ctx, arg)
		}
	}

	fp := gofeed.NewParser()
	feed, err := fp.Parse(resp.Body)
	if err != nil {
		return nil, err
	}

	for _, item := range feed.Items {
		if item.Description != "" {
			desc, err := ConvertHTMLToMarkdown(item.Description)
			if err == nil {
				item.Description = desc
			}
		}
		if item.Content != "" {
			content, err := ConvertHTMLToMarkdown(item.Content)
			if err == nil {
				item.Content = content
			}
		}
	}

	return feed, nil
}