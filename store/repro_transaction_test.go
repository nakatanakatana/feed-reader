package store_test

import (
	"context"
	"database/sql"
	"fmt"
	"sync"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/nakatanakatana/feed-reader/sql"
	"github.com/nakatanakatana/feed-reader/store"
	"github.com/stretchr/testify/require"
	_ "modernc.org/sqlite"
)

// setupReproStore creates a store with shared in-memory DB for concurrency testing.
func setupReproStore(t *testing.T) *store.Store {
	// Use cache=shared to allow multiple connections to see the same in-memory DB.
	// We use a unique name to avoid conflicts between tests if run in parallel.
	dsn := fmt.Sprintf("file:memdb_%s?mode=memory&cache=shared", uuid.NewString())
	db, err := sql.Open("sqlite", dsn)
	require.NoError(t, err)

	db.SetMaxOpenConns(10) // Allow concurrency

	// Initialize schema
	// We need to ensure schema is applied.
	// Since we are testing store, we can use direct exec.
	_, err = db.ExecContext(context.Background(), schema.Schema)
	require.NoError(t, err)

	t.Cleanup(func() {
		_ = db.Close()
	})

	return store.NewStore(db)
}

// TestRepro_ConcurrentTransactions attempts to reproduce "cannot start a transaction within a transaction"
// by running multiple SaveFetchedItem calls concurrently.
func TestRepro_ConcurrentTransactions(t *testing.T) {
	s := setupReproStore(t)
	ctx := context.Background()

	// Setup a Feed
	feedID := uuid.NewString()
	feedParams := store.CreateFeedParams{
		ID:  feedID,
		Url: "http://example.com/feed.xml",
	}
	_, err := s.CreateFeed(ctx, feedParams)
	require.NoError(t, err)

	// Concurrency level
	concurrency := 10
	iterations := 20

	var wg sync.WaitGroup
	errCh := make(chan error, concurrency*iterations)

	for i := 0; i < concurrency; i++ {
		wg.Add(1)
		go func(routineID int) {
			defer wg.Done()
			for j := 0; j < iterations; j++ {
				title := fmt.Sprintf("Item %d-%d", routineID, j)
				url := fmt.Sprintf("http://example.com/%d-%d", routineID, j)
				desc := "desc"
				pubAt := time.Now().Format(time.RFC3339)
				guid := uuid.NewString()

				params := store.SaveFetchedItemParams{
					FeedID:      feedID,
					Url:         url,
					Title:       &title,
					Description: &desc,
					PublishedAt: &pubAt,
					Guid:        &guid,
				}

				if err := s.SaveFetchedItem(ctx, params); err != nil {
					errCh <- err
				}
			}
		}(i)
	}

	wg.Wait()
	close(errCh)

	for err := range errCh {
		if err != nil {
			// We are looking for "cannot start a transaction within a transaction"
			if err.Error() == "failed to begin transaction: SQL logic error: cannot start a transaction within a transaction" {
				t.Logf("Successfully reproduced error: %v", err)
				return // Success
			}
			// Other errors (like busy) are possible but we specifically want to see the target error.
			// t.Logf("Got error: %v", err)
		}
	}
	t.Log("Did not reproduce the specific error with concurrent transactions.")
}

// TestRepro_NestedTransactions attempts to reproduce the error by explicitly nesting transactions
// via the WithTransaction method.
func TestRepro_NestedTransactions(t *testing.T) {
	s := setupReproStore(t)
	ctx := context.Background()

	err := s.WithTransaction(ctx, func(ctx context.Context, qtx *store.Queries) error {
		// Inside transaction 1
		// Call SaveFetchedItem which calls WithTransaction again (Transaction 2)
		
		feedID := uuid.NewString()
		_, err := qtx.CreateFeed(ctx, store.CreateFeedParams{
			ID: feedID,
			Url: "http://nested.com/feed",
		})
		if err != nil {
			return err
		}

		title := "Nested Item"
		url := "http://nested.com/item"
		desc := "desc"
		pubAt := time.Now().Format(time.RFC3339)
		guid := uuid.NewString()

		params := store.SaveFetchedItemParams{
			FeedID:      feedID,
			Url:         url,
			Title:       &title,
			Description: &desc,
			PublishedAt: &pubAt,
			Guid:        &guid,
		}

		// This calls s.WithTransaction. With the fix, it should reuse the existing transaction
		// and NOT try to begin a new one on a new connection (which would cause deadlock or error).
		// We pass the 'ctx' which contains the transaction.
		return s.SaveFetchedItem(ctx, params)
	})

	require.NoError(t, err)
}