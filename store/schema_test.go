package store_test

import (
	"context"
	"database/sql"
	"testing"

	_ "github.com/mattn/go-sqlite3"
	"github.com/nakatanakatana/feed-reader/sql"
)

func TestSchema(t *testing.T) {
	db, err := sql.Open("sqlite3", ":memory:")
	if err != nil {
		t.Fatalf("failed to open database: %v", err)
	}
	defer db.Close()

	if _, err := db.ExecContext(context.Background(), schema.Schema); err != nil {
		t.Fatalf("failed to create schema: %v", err)
	}

	tables := []string{"feeds", "items", "feed_items", "item_reads"}
	for _, table := range tables {
		row := db.QueryRow("SELECT name FROM sqlite_master WHERE type='table' AND name=?", table)
		var name string
		if err := row.Scan(&name); err != nil {
			t.Errorf("table %s does not exist", table)
		}
	}
}
