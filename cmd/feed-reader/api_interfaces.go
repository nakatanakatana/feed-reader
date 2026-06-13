package main

import (
	"context"

	"github.com/nakatanakatana/feed-reader/store"
)

type ItemFetcher interface {
	FetchAndSave(ctx context.Context, f store.FullFeed) error
	FetchFeedsByIDs(ctx context.Context, ids []string) error
	FetchFeedsByIDsSync(ctx context.Context, ids []string) ([]FeedFetchResult, error)
}
