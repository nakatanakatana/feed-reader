package main

import (
	"context"
	"database/sql"
	"fmt"
	"log/slog"
	"testing"

	"github.com/mmcdole/gofeed"
	"github.com/nakatanakatana/feed-reader/sql"
	"github.com/nakatanakatana/feed-reader/store"
	"gotest.tools/v3/assert"
	_ "modernc.org/sqlite"
)

func setupBenchmarkDB(b *testing.B) (*store.Queries, *sql.DB) {
	b.Helper()
	db, err := sql.Open("sqlite", ":memory:")
	assert.NilError(b, err, "failed to open db")

	db.SetMaxOpenConns(1)

	_, err = db.Exec("PRAGMA foreign_keys = ON")
	assert.NilError(b, err, "failed to enable foreign keys")

	_, err = db.Exec(schema.Schema)
	assert.NilError(b, err, "failed to apply schema")

	return store.New(db), db
}

func generateLargeOPML(count int) []byte {
	content := "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<opml version=\"1.0\">\n    <body>"
	for i := 0; i < count; i++ {
		content += fmt.Sprintf("\n        <outline text=\"Feed %d\" xmlUrl=\"https://example.com/feed/%d\" />", i, i)
	}
	content += "\n    </body>\n</opml>"
	return []byte(content)
}

func BenchmarkOPMLImporter_ImportSync(b *testing.B) {
	ctx := context.Background()
	opmlContent := generateLargeOPML(500)

	_, db := setupBenchmarkDB(b)
	s := store.NewStore(db)

	fetcher := &mockFetcher{
		feed: &gofeed.Feed{Title: "Fetched Title"},
	}

	importer := NewOPMLImporter(s, fetcher, slog.Default(), nil)

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		b.StopTimer()
		_, dbIteration := setupBenchmarkDB(b)
		sIteration := store.NewStore(dbIteration)
		importer.store = sIteration
		b.StartTimer()

		_, err := importer.ImportSync(ctx, opmlContent)
		if err != nil {
			b.Fatalf("ImportSync failed: %v", err)
		}
	}
}
