package schema

import (
	"context"
	"database/sql"
	"testing"

	"gotest.tools/v3/assert"
	_ "modernc.org/sqlite"
)

func TestBlockingRulesTableExists(t *testing.T) {
	db, err := sql.Open("sqlite", ":memory:")
	assert.NilError(t, err)
	defer func() {
		_ = db.Close()
	}()

	_, err = db.ExecContext(context.Background(), Schema)
	assert.NilError(t, err)

	row := db.QueryRow("SELECT name FROM sqlite_master WHERE type='table' AND name=?", "blocking_rules")
	var name string
	err = row.Scan(&name)
	assert.NilError(t, err, "table blocking_rules does not exist")
}
