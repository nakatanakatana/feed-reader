package store_test

import (
	"database/sql"
	"path/filepath"
	"testing"

	"github.com/nakatanakatana/feed-reader/store"
	_ "github.com/ncruces/go-sqlite3/driver"
	"gotest.tools/v3/assert"
	_ "modernc.org/sqlite"
)

func TestOpenReadOnlyDB(t *testing.T) {
	dbPath := filepath.Join(t.TempDir(), "readonly.db")
	createReadOnlyFixtureDB(t, dbPath)

	const maxOpen = 3
	dsn := "file:" + dbPath + "?mode=ro"
	db, err := store.OpenReadOnlyDB(dsn, maxOpen)
	assert.NilError(t, err)
	defer func() { _ = db.Close() }()

	var one int
	err = db.QueryRow("SELECT 1").Scan(&one)
	assert.NilError(t, err)
	assert.Equal(t, 1, one)

	_, err = db.Exec("INSERT INTO test_values(value) VALUES ('x')")
	assert.Assert(t, err != nil, "expected INSERT to fail on readonly path")

	assert.Equal(t, maxOpen, db.Stats().MaxOpenConnections)
}

func TestVerifyReadOnlyDB(t *testing.T) {
	dbPath := filepath.Join(t.TempDir(), "verify-readonly.db")
	createReadOnlyFixtureDB(t, dbPath)

	db, err := sql.Open("sqlite3", "file:"+dbPath+"?mode=ro")
	assert.NilError(t, err)
	defer func() { _ = db.Close() }()

	err = store.VerifyReadOnlyDB(db)
	assert.NilError(t, err)
}

func createReadOnlyFixtureDB(t *testing.T, dbPath string) {
	t.Helper()

	db, err := sql.Open("sqlite", dbPath)
	assert.NilError(t, err)
	defer func() { _ = db.Close() }()

	_, err = db.Exec(`
		CREATE TABLE test_values (value TEXT);
		CREATE TRIGGER forbid_insert BEFORE INSERT ON test_values
		BEGIN
			SELECT RAISE(ABORT, 'write forbidden');
		END;
		CREATE TRIGGER forbid_update BEFORE UPDATE ON test_values
		BEGIN
			SELECT RAISE(ABORT, 'write forbidden');
		END;
		CREATE TRIGGER forbid_delete BEFORE DELETE ON test_values
		BEGIN
			SELECT RAISE(ABORT, 'write forbidden');
		END;
	`)
	assert.NilError(t, err)
}
