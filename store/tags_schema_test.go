package store_test

import (
	"context"
	"database/sql"
	"testing"

	_ "github.com/mattn/go-sqlite3"
	schema "github.com/nakatanakatana/feed-reader/sql"
)

func TestTagsSchema(t *testing.T) {
	db, err := sql.Open("sqlite3", ":memory:")
	if err != nil {
		t.Fatalf("failed to open database: %v", err)
	}
	defer func() {
		_ = db.Close()
	}()

	if _, err := db.ExecContext(context.Background(), schema.Schema); err != nil {
		t.Fatalf("failed to create schema: %v", err)
	}

	tables := []string{"tags", "feed_tags"}
	for _, table := range tables {
		row := db.QueryRow("SELECT name FROM sqlite_master WHERE type='table' AND name=?", table)
		var name string
		if err := row.Scan(&name); err != nil {
			t.Errorf("table %s does not exist", table)
		}
	}
}
