package store_test

import (
	"context"
	"database/sql"
	"fmt"
	"path/filepath"
	"sync"
	"testing"

	"github.com/nakatanakatana/feed-reader/store"
	"gotest.tools/v3/assert"
)

func TestDBConnForeignKeysOnAllConnections(t *testing.T) {
	db, err := store.OpenDB("file::memory:?cache=shared")
	assert.NilError(t, err)
	defer func() { _ = db.Close() }()

	db.SetMaxOpenConns(5)

	var wg sync.WaitGroup
	errorsChan := make(chan error, 5)

	for i := 0; i < 5; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			// Use a transaction to hold the connection open
			tx, err := db.BeginTx(context.Background(), nil)
			if err != nil {
				errorsChan <- err
				return
			}
			defer func() { _ = tx.Rollback() }()

			var enabled int
			err = tx.QueryRowContext(context.Background(), "PRAGMA foreign_keys").Scan(&enabled)
			if err != nil {
				errorsChan <- err
				return
			}

			if enabled != 1 {
				errorsChan <- fmt.Errorf("foreign_keys is not enabled")
				return
			}
		}()
	}

	wg.Wait()
	close(errorsChan)

	for err := range errorsChan {
		assert.NilError(t, err)
	}
}

func TestDBConnForeignKeysAfterCancel(t *testing.T) {
	db, err := store.OpenDB("file::memory:?cache=shared")
	assert.NilError(t, err)
	defer func() { _ = db.Close() }()

	// Create tables with a foreign key constraint
	_, err = db.Exec(`
		CREATE TABLE parents (id TEXT PRIMARY KEY);
		CREATE TABLE children (
			id TEXT PRIMARY KEY,
			parent_id TEXT,
			FOREIGN KEY (parent_id) REFERENCES parents(id) ON DELETE CASCADE
		);
	`)
	assert.NilError(t, err)

	// Set max open conns to 1 to ensure we reuse the same connection
	db.SetMaxOpenConns(1)

	// Step 1: Start a transaction and cancel the context during execution
	ctx, cancel := context.WithCancel(context.Background())
	tx, err := db.BeginTx(ctx, nil)
	assert.NilError(t, err)

	// Insert into parents
	_, err = tx.ExecContext(ctx, "INSERT INTO parents (id) VALUES ('p1')")
	assert.NilError(t, err)

	// Cancel the context now
	cancel()

	// Try to execute another query in the same transaction - should fail with canceled context
	_, err = tx.ExecContext(ctx, "INSERT INTO children (id, parent_id) VALUES ('c1', 'p1')")
	assert.ErrorIs(t, err, context.Canceled)

	// Rollback the transaction
	_ = tx.Rollback()

	// Step 2: Use a fresh context on the same connection, verify foreign_keys is still ON
	freshCtx := context.Background()
	var enabled int
	err = db.QueryRowContext(freshCtx, "PRAGMA foreign_keys").Scan(&enabled)
	assert.NilError(t, err)
	assert.Equal(t, enabled, 1, "foreign_keys should still be enabled after rollback/cancel")

	// Step 3: Insert invalid FK data, it must fail (proving FK is active)
	_, err = db.ExecContext(freshCtx, "INSERT INTO children (id, parent_id) VALUES ('c2', 'non-existent')")
	assert.Assert(t, err != nil, "Insert with invalid FK should fail")
}

func TestDBConnForeignKeyCheck(t *testing.T) {
	// 1. Create a database and insert invalid FK data with foreign_keys = OFF
	tmpDir := t.TempDir()
	dbPath := filepath.Join(tmpDir, "test_fk_check.db")

	rawDB, err := sql.Open("sqlite", dbPath)
	assert.NilError(t, err)

	_, err = rawDB.Exec(`
		PRAGMA foreign_keys = OFF;
		CREATE TABLE parents (id TEXT PRIMARY KEY);
		CREATE TABLE children (
			id TEXT PRIMARY KEY,
			parent_id TEXT,
			FOREIGN KEY (parent_id) REFERENCES parents(id) ON DELETE CASCADE
		);
		-- Insert orphan child
		INSERT INTO children (id, parent_id) VALUES ('c1', 'non-existent');
	`)
	assert.NilError(t, err)
	_ = rawDB.Close()

	// 2. Try to open the database via store.OpenDB, it should fail due to FK violations
	_, err = store.OpenDB(dbPath)
	assert.Assert(t, err != nil, "OpenDB should fail when there are FK violations")
	assert.ErrorContains(t, err, "foreign key violation")
}
