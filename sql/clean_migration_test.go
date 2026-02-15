package schema

import (
	"context"
	"database/sql"
	"path/filepath"
	"testing"

	"gotest.tools/v3/assert"
	_ "modernc.org/sqlite"
)

func TestCleanMigration(t *testing.T) {
	ctx := context.Background()
	tmpDir := t.TempDir()
	dbPath := filepath.Join(tmpDir, "clean_test.db")

	// 1. Run Migration with the full Schema
	err := Migrate(ctx, dbPath, Schema, false)
	assert.NilError(t, err)

	// 2. Verify all tables exist
	db, err := sql.Open("sqlite", dbPath)
	assert.NilError(t, err)
	defer func() { _ = db.Close() }()

	tables := []string{"feeds", "items", "feed_items", "item_reads", "tags", "feed_tags", "feed_fetcher"}
	for _, table := range tables {
		var name string
		err = db.QueryRow("SELECT name FROM sqlite_master WHERE type='table' AND name=?", table).Scan(&name)
		assert.NilError(t, err, "Table %s should exist", table)
	}

	// 3. Verify columns in feed_fetcher
	var count int
	err = db.QueryRow("SELECT count(*) FROM pragma_table_info('feed_fetcher') WHERE name='next_fetch'").Scan(&count)
	assert.NilError(t, err)
	assert.Equal(t, count, 1, "next_fetch column should exist")
}
