package store_test

import (
	"context"
	"database/sql"
	"os"
	"path/filepath"
	"testing"
	"time"

	_ "github.com/mattn/go-sqlite3"
	"github.com/nakatanakatana/feed-reader/sql"
	"github.com/nakatanakatana/feed-reader/store"
	"github.com/stretchr/testify/require"
)

func TestStore_RetryIntegration(t *testing.T) {
	// Create a temporary directory for the SQLite file
	tmpDir, err := os.MkdirTemp("", "store-retry-test-*")
	require.NoError(t, err)
	defer func() { _ = os.RemoveAll(tmpDir) }()

	dbPath := filepath.Join(tmpDir, "test.db")

	// Helper to open connection
	openDB := func() *sql.DB {
		db, err := sql.Open("sqlite3", dbPath+"?_busy_timeout=1")
		require.NoError(t, err)
		return db
	}

	// 1. Setup Schema
	db1 := openDB()
	defer func() { _ = db1.Close() }()
	_, err = db1.Exec(schema.Schema)
	require.NoError(t, err)

	s := store.NewStore(db1)
	ctx := context.Background()

	t.Run("retry on concurrent write", func(t *testing.T) {
		// Use a second connection to lock the database
		db2 := openDB()
		defer func() { _ = db2.Close() }()

		// Start a transaction in db2 and hold a lock
		// Use BEGIN IMMEDIATE to acquire a RESERVED lock immediately
		_, err = db2.Exec("BEGIN IMMEDIATE")
		require.NoError(t, err)

		// Execute a write in tx2
		_, err = db2.ExecContext(ctx, "INSERT INTO feeds (uuid, url) VALUES ('lock', 'lock')")
		require.NoError(t, err)

		// Now try to write via s (db1). It should fail with BUSY but retry.
		done := make(chan error, 1)
		go func() {
			err := s.CreateFeedItem(ctx, store.CreateFeedItemParams{
				FeedID: "lock",
				ItemID: "some-item",
			})
			done <- err
		}()

		// Give it a moment to try and hit the busy error
		time.Sleep(100 * time.Millisecond)

		// then commit tx2 to release the lock
		_, err = db2.Exec("COMMIT")
		require.NoError(t, err)

		// s.CreateFeedItem should now succeed after retry
		err = <-done
		require.NoError(t, err)
	})
}
