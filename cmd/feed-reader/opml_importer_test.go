package main

import (
	"context"
	"encoding/json"
	"errors"
	"log/slog"
	"testing"

	"github.com/mmcdole/gofeed"
	"github.com/nakatanakatana/feed-reader/store"
	"gotest.tools/v3/assert"
	"gotest.tools/v3/golden"
)

func TestOPMLImporter_ImportSync(t *testing.T) {
	ctx := context.Background()
	opmlContent := `<?xml version="1.0" encoding="UTF-8"?>
<opml version="1.0">
    <body>
        <outline text="New Feed" xmlUrl="https://example.com/new" />
        <outline text="Existing Feed" xmlUrl="https://example.com/existing" />
        <outline text="Fail Feed" xmlUrl="https://example.com/fail" />
    </body>
</opml>`

	queries, db := setupTestDB(t)
	s := store.NewStore(db)

	// Pre-create existing
	_, _ = queries.CreateFeed(ctx, store.CreateFeedParams{
		ID:    "existing-id",
		Url:   "https://example.com/existing",
		Title: func() *string { s := "Existing"; return &s }(),
	})

	fetcher := &mockFetcher{
		feed: &gofeed.Feed{Title: "Fetched Title"},
		errs: map[string]error{
			"https://example.com/fail": errors.New("fetch error"),
		},
	}

	importer := NewOPMLImporter(s, fetcher, slog.Default(), nil)

	results, err := importer.ImportSync(ctx, []byte(opmlContent))
	assert.NilError(t, err)

	data, err := json.MarshalIndent(results, "", "  ")
	assert.NilError(t, err)
	golden.Assert(t, string(data), "opml_import_results.golden")

	// Verify DB
	feeds, _ := queries.ListFeeds(ctx, nil)
	assert.Equal(t, len(feeds), 2) // existing + new
}

func TestOPMLImporter_ImportSync_Errors(t *testing.T) {
	ctx := context.Background()
	_, db := setupTestDB(t)
	s := store.NewStore(db)

	t.Run("Parse Error", func(t *testing.T) {
		importer := NewOPMLImporter(s, &mockFetcher{}, slog.Default(), nil)
		results, err := importer.ImportSync(ctx, []byte("invalid xml"))
		assert.Assert(t, err != nil)
		assert.Assert(t, results == nil)
	})

	t.Run("UUID Error", func(t *testing.T) {
		opmlContent := `<?xml version="1.0" encoding="UTF-8"?><opml version="1.0"><body><outline xmlUrl="https://example.com/new" /></body></opml>`
		fetcher := &mockFetcher{feed: &gofeed.Feed{Title: "Title"}}
		// mockUUIDGenerator with error
		importer := NewOPMLImporter(s, fetcher, slog.Default(), mockUUIDGenerator{err: errors.New("uuid error")})
		results, err := importer.ImportSync(ctx, []byte(opmlContent))
		assert.Assert(t, err != nil)
		assert.Assert(t, results == nil)
	})
}
