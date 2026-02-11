package store_test

import (
	"context"
	"database/sql"
	"testing"

	"github.com/nakatanakatana/feed-reader/sql"
	"gotest.tools/v3/assert"
	_ "modernc.org/sqlite"
)

func TestSchema(t *testing.T) {
	db, err := sql.Open("sqlite", ":memory:")
	assert.NilError(t, err)
	defer func() {
		_ = db.Close()
	}()

	_, err = db.ExecContext(context.Background(), schema.Schema)
	assert.NilError(t, err)

	tables := []string{"feeds", "items", "feed_items", "item_reads"}
	for _, table := range tables {
		row := db.QueryRow("SELECT name FROM sqlite_master WHERE type='table' AND name=?", table)
		var name string
		err := row.Scan(&name)
		assert.NilError(t, err, "table %s does not exist", table)
	}
}
