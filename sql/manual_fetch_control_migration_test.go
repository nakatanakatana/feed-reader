package schema

import (
	"context"
	"database/sql"
	"path/filepath"
	"testing"

	"gotest.tools/v3/assert"
	_ "modernc.org/sqlite"
)

func TestManualFetchControlMigration(t *testing.T) {
	ctx := context.Background()
	tmpDir := t.TempDir()
	dbPath := filepath.Join(tmpDir, "test.db")

	// 1. Setup Old Schema
	oldSchema := `
CREATE TABLE feeds (
  id              TEXT PRIMARY KEY,
  url             TEXT NOT NULL UNIQUE,
  link            TEXT,
  title           TEXT,
  description     TEXT,
  lang            TEXT,
  image_url       TEXT,
  copyright       TEXT,
  feed_type       TEXT,
  feed_version    TEXT,
  last_fetched_at TEXT,
  created_at      TEXT NOT NULL DEFAULT (strftime('%FT%TZ', 'now')),
  updated_at      TEXT NOT NULL DEFAULT (strftime('%FT%TZ', 'now'))
);
CREATE TABLE feed_fetcher_cache (
  feed_id       TEXT PRIMARY KEY,
  etag          TEXT,
  last_modified TEXT,
  created_at    TEXT NOT NULL DEFAULT (strftime('%FT%TZ', 'now')),
  updated_at    TEXT NOT NULL DEFAULT (strftime('%FT%TZ', 'now')),
  FOREIGN KEY (feed_id) REFERENCES feeds(id) ON DELETE CASCADE
);
`
	db, err := sql.Open("sqlite", dbPath)
	assert.NilError(t, err)
	_, err = db.Exec(oldSchema)
	assert.NilError(t, err)

	// 2. Insert Test Data
	_, err = db.Exec(`INSERT INTO feeds (id, url, last_fetched_at) VALUES ('feed1', 'http://example.com/feed1', '2023-01-01T00:00:00Z')`)
	assert.NilError(t, err)
	_, err = db.Exec(`INSERT INTO feed_fetcher_cache (feed_id, etag, last_modified) VALUES ('feed1', 'etag1', 'lastmod1')`)
	assert.NilError(t, err)
	db.Close()

	// 3. Run Migration with New Schema
	err = Migrate(ctx, dbPath, Schema, false)
	assert.NilError(t, err)

	// 4. Verify Data Migration
	db, err = sql.Open("sqlite", dbPath)
	assert.NilError(t, err)
	defer db.Close()

	var etag, lastFetchedAt, nextFetch string
	err = db.QueryRow("SELECT etag, last_fetched_at, next_fetch FROM feed_fetcher WHERE feed_id = 'feed1'").Scan(&etag, &lastFetchedAt, &nextFetch)
	assert.NilError(t, err)

	assert.Equal(t, etag, "etag1")
	assert.Equal(t, lastFetchedAt, "2023-01-01T00:00:00Z")
	assert.Assert(t, nextFetch != "", "next_fetch should be initialized")
}
