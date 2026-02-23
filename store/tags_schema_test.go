package store_test

import (
	"context"
	"testing"

	schema "github.com/nakatanakatana/feed-reader/sql"
	"github.com/nakatanakatana/feed-reader/store"
	"gotest.tools/v3/assert"
	_ "modernc.org/sqlite"
)

func TestTagsSchema(t *testing.T) {
	db, err := store.OpenDB(":memory:")
	assert.NilError(t, err)
	defer func() {
		_ = db.Close()
	}()

	_, err = db.ExecContext(context.Background(), schema.Schema)
	assert.NilError(t, err)

	tables := []string{"tags", "feed_tags"}
	for _, table := range tables {
		row := db.QueryRow("SELECT name FROM sqlite_master WHERE type='table' AND name=?", table)
		var name string
		err := row.Scan(&name)
		assert.NilError(t, err, "table %s does not exist", table)
	}
}
