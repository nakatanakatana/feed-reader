package schema

import (
	"context"
	"database/sql"
	"strings"
	"testing"

	"gotest.tools/v3/assert"
	_ "modernc.org/sqlite"
)

func TestItemsHiddenColumnExists(t *testing.T) {
	db, err := sql.Open("sqlite", ":memory:")
	assert.NilError(t, err)
	defer func() {
		_ = db.Close()
	}()

	_, err = db.ExecContext(context.Background(), Schema)
	assert.NilError(t, err)

	row := db.QueryRow("SELECT sql FROM sqlite_master WHERE type='table' AND name='items'")
	var sql string
	err = row.Scan(&sql)
	assert.NilError(t, err)

	assert.Check(t, strings.Contains(sql, "is_hidden"), "column is_hidden does not exist in items table: %s", sql)
}
