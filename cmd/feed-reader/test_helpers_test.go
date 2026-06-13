package main

import (
	"context"
	"database/sql"
	"testing"

	"github.com/google/uuid"
	"github.com/mmcdole/gofeed"
	"github.com/nakatanakatana/feed-reader/sql"
	"github.com/nakatanakatana/feed-reader/store"
	"gotest.tools/v3/assert"
)

func setupTestDB(t *testing.T) (*store.Queries, *sql.DB) {
	t.Helper()
	db, err := store.OpenDB(":memory:")
	assert.NilError(t, err, "failed to open db")

	// For in-memory SQLite, limit to one connection so all goroutines share the same database.
	db.SetMaxOpenConns(1)

	_, err = db.Exec(schema.Schema)
	assert.NilError(t, err, "failed to apply schema")

	t.Cleanup(func() {
		err := db.Close()
		assert.NilError(t, err, "failed to close db in cleanup")
	})

	return store.New(db), db
}

type mockUUIDGenerator struct {
	err error
}

func (m mockUUIDGenerator) NewRandom() (uuid.UUID, error) {
	if m.err != nil {
		return uuid.UUID{}, m.err
	}
	return uuid.NewRandom()
}

type mockFetcher struct {
	feed *gofeed.Feed
	err  error
	errs map[string]error
}

func (m *mockFetcher) Fetch(ctx context.Context, feedID string, url string) (*gofeed.Feed, error) {
	if m.errs != nil {
		if err, ok := m.errs[url]; ok {
			return nil, err
		}
	}
	if m.err != nil {
		return nil, m.err
	}
	if m.feed == nil {
		return &gofeed.Feed{}, nil
	}
	return m.feed, nil
}

type mockItemFetcher struct {
	called bool
	err    error
	ids    []string
}

func (m *mockItemFetcher) FetchAndSave(ctx context.Context, f store.FullFeed) error {
	m.called = true
	return m.err
}

func (m *mockItemFetcher) FetchFeedsByIDs(ctx context.Context, ids []string) error {
	m.called = true
	m.ids = ids
	return m.err
}

func (m *mockItemFetcher) FetchFeedsByIDsSync(ctx context.Context, ids []string) ([]FeedFetchResult, error) {
	m.called = true
	m.ids = ids
	if m.err != nil {
		return nil, m.err
	}
	results := make([]FeedFetchResult, len(ids))
	for i, id := range ids {
		results[i] = FeedFetchResult{FeedID: id, Success: true}
	}
	return results, nil
}
