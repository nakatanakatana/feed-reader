package httpapi

import (
	"context"
	"io/fs"

	"github.com/mmcdole/gofeed"
	"github.com/nakatanakatana/feed-reader/store"
)

// Dependencies holds HTTP API construction inputs.
// Readonly callers may supply only Store and Assets; mutation handlers
// access optional primary-only dependencies when invoked.
type Dependencies struct {
	Store          *store.Store
	Fetcher        FeedFetcher
	ItemFetcher    ItemFetcher
	OPMLImporter   OPMLImporter
	Assets         fs.FS
	AllowedOrigins []string
	// AllowedMethods is written to Access-Control-Allow-Methods.
	// Empty defaults to primary methods: GET, POST, OPTIONS, PUT, DELETE.
	AllowedMethods string
}

// FeedFetcher fetches RSS/Atom feeds.
type FeedFetcher interface {
	Fetch(ctx context.Context, feedID string, url string) (*gofeed.Feed, error)
}

// FeedFetchResult is the outcome of a synchronous feed refresh.
type FeedFetchResult struct {
	FeedID        string
	Success       bool
	NewItemsCount int32
	ErrorMessage  string
}

// ItemFetcher refreshes feed items.
type ItemFetcher interface {
	FetchAndSave(ctx context.Context, f store.FullFeed) error
	FetchFeedsByIDs(ctx context.Context, ids []string) error
	FetchFeedsByIDsSync(ctx context.Context, ids []string) ([]FeedFetchResult, error)
}

// ImportFailedFeed describes a single OPML import failure.
type ImportFailedFeed struct {
	URL          string
	ErrorMessage string
}

// ImportResults summarizes an OPML import.
type ImportResults struct {
	Total       int32
	Success     int32
	Skipped     int32
	FailedFeeds []ImportFailedFeed
}

// OPMLImporter imports OPML documents.
type OPMLImporter interface {
	ImportSync(ctx context.Context, opmlContent []byte) (*ImportResults, error)
}
