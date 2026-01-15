package store_test

import (
	"context"
	"database/sql"
	"testing"
	"time"

	"github.com/google/uuid"
	_ "github.com/mattn/go-sqlite3"
	"github.com/nakatanakatana/feed-reader/sql"
	"github.com/nakatanakatana/feed-reader/store"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func setupStore(t *testing.T) *store.Store {
	db, err := sql.Open("sqlite3", ":memory:")
	require.NoError(t, err)

	_, err = db.ExecContext(context.Background(), schema.Schema)
	require.NoError(t, err)

	t.Cleanup(func() {
		db.Close()
	})

	return store.NewStore(db)
}

func TestStore_SaveFetchedItem(t *testing.T) {
	s := setupStore(t)
	ctx := context.Background()

	// 1. Setup a Feed
	feedID := uuid.NewString()
	feedParams := store.CreateFeedParams{
		Uuid: feedID,
		Url:  "http://example.com/feed.xml",
	}
	_, err := s.CreateFeed(ctx, feedParams)
	require.NoError(t, err)

	// 2. Define Item Params
	itemURL := "http://example.com/article/1"
	title := "Article 1"
	desc := "Content of article 1"
	pubAt := time.Now().Format(time.RFC3339)
	guid := "guid-1"

	params := store.SaveFetchedItemParams{
		FeedID:      feedID,
		Url:         itemURL,
		Title:       &title,
		Description: &desc,
		PublishedAt: &pubAt,
		Guid:        &guid,
	}

	// 3. First Save (Should succeed)
	t.Run("First Save", func(t *testing.T) {
		err := s.SaveFetchedItem(ctx, params)
		require.NoError(t, err)

		// Verify Item exists
		// We can't query by URL easily without adding a GetItemByUrl query, 
		// but we can ListItems (if available) or just assume if no error it's fine.
		// Wait, we should verify data.
		// Since we don't have GetItemByURL, let's just inspect the DB directly or use generated queries?
		// We can use s.db.QueryRow...
		// But s.Queries doesn't expose GetItemByURL? Let's check query.sql.go.
	})

    // Let's verify side effects manually via raw SQL for now if helper not available
    var itemID string
    err = s.DB.QueryRowContext(ctx, "SELECT id FROM items WHERE url = ?", itemURL).Scan(&itemID)
    require.NoError(t, err)
    require.NotEmpty(t, itemID)

    // Verify FeedItem link
    var linkCount int
    err = s.DB.QueryRowContext(ctx, "SELECT count(*) FROM feed_items WHERE feed_id = ? AND item_id = ?", feedID, itemID).Scan(&linkCount)
    require.NoError(t, err)
    assert.Equal(t, 1, linkCount)

    // Verify ItemRead
    var readCount int
    err = s.DB.QueryRowContext(ctx, "SELECT count(*) FROM item_reads WHERE item_id = ? AND is_read = 0", itemID).Scan(&readCount)
    require.NoError(t, err)
    assert.Equal(t, 1, readCount)

	// 4. Second Save (Duplicate URL - Should update title, keep ID, ignore link/read duplication)
	t.Run("Second Save (Idempotent)", func(t *testing.T) {
        newTitle := "Article 1 Updated"
        params.Title = &newTitle
        
		err := s.SaveFetchedItem(ctx, params)
		require.NoError(t, err)

        // Verify ID is same
        var newItemID string
        err = s.DB.QueryRowContext(ctx, "SELECT id, title FROM items WHERE url = ?", itemURL).Scan(&newItemID, &newTitle)
        require.NoError(t, err)
        assert.Equal(t, itemID, newItemID)
        assert.Equal(t, "Article 1 Updated", newTitle)

        // Verify Link count still 1
        err = s.DB.QueryRowContext(ctx, "SELECT count(*) FROM feed_items WHERE feed_id = ? AND item_id = ?", feedID, itemID).Scan(&linkCount)
        require.NoError(t, err)
        assert.Equal(t, 1, linkCount)
	})

	t.Run("Error on Closed DB", func(t *testing.T) {
		// Create a separate store with a closed DB to avoid affecting other tests if we were reusing
		// But here we can just close the main DB since it's the last test or we can create a new one.
		// Use a new one to be clean.
		
		db, err := sql.Open("sqlite3", ":memory:")
		require.NoError(t, err)
		storeClosed := store.NewStore(db)
		db.Close()
		
		err = storeClosed.SaveFetchedItem(ctx, params)
		require.Error(t, err)
		assert.Contains(t, err.Error(), "failed to begin transaction")
	})
}
