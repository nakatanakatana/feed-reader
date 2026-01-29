package schema

import (
	"context"
	"path/filepath"
	"testing"

	"github.com/stretchr/testify/require"
	_ "modernc.org/sqlite"
)

func TestMigrate(t *testing.T) {
	ctx := context.Background()
	tmpDir := t.TempDir()
	dbPath := filepath.Join(tmpDir, "test.db")

	// 1. Initial migration
	initialSchema := `CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT);`
	err := Migrate(ctx, dbPath, initialSchema, false)
	require.NoError(t, err)

	// Verify table exists
	// We can just try to migrate again with the same schema, it should do nothing
	err = Migrate(ctx, dbPath, initialSchema, false)
	require.NoError(t, err)

	// 2. Add a column
	updatedSchema := `CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT, email TEXT);`
	err = Migrate(ctx, dbPath, updatedSchema, false)
	require.NoError(t, err)

	// 3. Dry run with difference
	outOfSyncSchema := `CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT, email TEXT, age INTEGER);`
	err = Migrate(ctx, dbPath, outOfSyncSchema, true)
	require.Error(t, err)
	require.Contains(t, err.Error(), "database schema is out of sync")
	require.Contains(t, err.Error(), "ADD COLUMN age")

	// 4. Dry run with no difference
	err = Migrate(ctx, dbPath, updatedSchema, true)
	require.NoError(t, err)

	// 5. Test with IF NOT EXISTS
	schemaWithIfNotExists := `CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, name TEXT, email TEXT);`
	err = Migrate(ctx, dbPath, schemaWithIfNotExists, false)
	require.NoError(t, err)
}
