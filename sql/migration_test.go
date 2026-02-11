package schema

import (
	"context"
	"path/filepath"
	"testing"

	"gotest.tools/v3/assert"
	"gotest.tools/v3/assert/cmp"
	_ "modernc.org/sqlite"
)

func TestMigrate(t *testing.T) {
	ctx := context.Background()
	tmpDir := t.TempDir()
	dbPath := filepath.Join(tmpDir, "test.db")

	// 1. Initial migration
	initialSchema := `CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT);`
	err := Migrate(ctx, dbPath, initialSchema, false)
	assert.NilError(t, err)

	// Verify table exists
	// We can just try to migrate again with the same schema, it should do nothing
	err = Migrate(ctx, dbPath, initialSchema, false)
	assert.NilError(t, err)

	// 2. Add a column
	updatedSchema := `CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT, email TEXT);`
	err = Migrate(ctx, dbPath, updatedSchema, false)
	assert.NilError(t, err)

	// 3. Dry run with difference
	outOfSyncSchema := `CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT, email TEXT, age INTEGER);`
	err = Migrate(ctx, dbPath, outOfSyncSchema, true)
	assert.Assert(t, err != nil)
	assert.Assert(t, cmp.Contains(err.Error(), "database schema is out of sync"))
	assert.Assert(t, cmp.Contains(err.Error(), "ADD COLUMN age"))

	// 4. Dry run with no difference
	err = Migrate(ctx, dbPath, updatedSchema, true)
	assert.NilError(t, err)

	// 5. Test with IF NOT EXISTS
	schemaWithIfNotExists := `CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, name TEXT, email TEXT);`
	err = Migrate(ctx, dbPath, schemaWithIfNotExists, false)
	assert.NilError(t, err)
}
