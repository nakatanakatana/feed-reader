package store_test

import (
	"context"
	"database/sql"
	"os"
	"path/filepath"
	"testing"
	"time"

	"github.com/nakatanakatana/feed-reader/sql"
	"github.com/nakatanakatana/feed-reader/store"
	_ "github.com/ncruces/go-sqlite3/driver"
	_ "github.com/ncruces/go-sqlite3/embed"
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

		// Create item first to satisfy FK
		_, err := s.CreateItem(ctx, store.CreateItemParams{ID: "some-item", Url: "u-lock"})
		require.NoError(t, err)

		// Start a transaction in db2 and hold a lock
		// Use BEGIN IMMEDIATE to acquire a RESERVED lock immediately
		_, err = db2.Exec("BEGIN IMMEDIATE")
		require.NoError(t, err)

		// Execute a write in tx2
		_, err = db2.ExecContext(ctx, "INSERT INTO feeds (id, url) VALUES ('lock', 'lock')")
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

	t.Run("retry on transactional write", func(t *testing.T) {
		db2 := openDB()
		defer func() { _ = db2.Close() }()

		// Setup a feed first
		_, err := s.CreateFeed(ctx, store.CreateFeedParams{
			ID:  "f1",
			Url: "http://example.com/f1",
		})
		require.NoError(t, err)

		// Start a transaction in db2 and hold a lock
		_, err = db2.Exec("BEGIN IMMEDIATE")
		require.NoError(t, err)
		_, err = db2.ExecContext(ctx, "INSERT INTO feeds (id, url) VALUES ('lock2', 'lock2')")
		require.NoError(t, err)

		done := make(chan error, 1)
		go func() {
			title := "title"
			err := s.SaveFetchedItem(ctx, store.SaveFetchedItemParams{
				FeedID: "f1",
				Url:    "http://example.com/item1",
				Title:  &title,
			})
			done <- err
		}()

		time.Sleep(100 * time.Millisecond)
		_, err = db2.Exec("COMMIT")
		require.NoError(t, err)

		err = <-done
		// This should FAIL currently because SaveFetchedItem doesn't retry the transaction
		require.NoError(t, err)
	})
}
