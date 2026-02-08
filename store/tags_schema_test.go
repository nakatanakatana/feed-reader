package store_test

import (
	"context"
	"database/sql"
	"testing"

	"github.com/nakatanakatana/feed-reader/sql"
	_ "github.com/ncruces/go-sqlite3/driver"
	_ "github.com/ncruces/go-sqlite3/embed"
	"github.com/stretchr/testify/assert"
)

func TestTagsSchema(t *testing.T) {
	db, err := sql.Open("sqlite3", ":memory:")
	assert.NoError(t, err)
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
