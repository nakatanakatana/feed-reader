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
		_ = db.Close()
	})

	return store.NewStore(db)
}

func TestStore_SaveFetchedItem(t *testing.T) {
	s := setupStore(t)
	ctx := context.Background()

	// 1. Setup a Feed
	feedID := uuid.NewString()
	feedParams := store.CreateFeedParams{
		ID:  feedID,
		Url: "http://example.com/feed.xml",
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
	})

	// 4. Second Save (Idempotent)
	t.Run("Second Save (Idempotent)", func(t *testing.T) {
		newTitle := "Article 1 Updated"
		params.Title = &newTitle

		err := s.SaveFetchedItem(ctx, params)
		require.NoError(t, err)

		// Verify ID is same
		var newItemID string
		err = s.DB.QueryRowContext(ctx, "SELECT id, title FROM items WHERE url = ?", itemURL).Scan(&newItemID, &newTitle)
		require.NoError(t, err)
		assert.Equal(t, newItemID, newItemID)
		assert.Equal(t, "Article 1 Updated", newTitle)

		// Verify Link count still 1
		var linkCount int
		err = s.DB.QueryRowContext(ctx, "SELECT count(*) FROM feed_items WHERE feed_id = ? AND item_id = ?", feedID, newItemID).Scan(&linkCount)
		require.NoError(t, err)
		assert.Equal(t, 1, linkCount)
	})

	t.Run("Error on Closed DB", func(t *testing.T) {
		db, err := sql.Open("sqlite3", ":memory:")
		require.NoError(t, err)
		storeClosed := store.NewStore(db)
		_ = db.Close()

		err = storeClosed.SaveFetchedItem(ctx, params)
		require.Error(t, err)
		assert.Contains(t, err.Error(), "failed to begin transaction")
	})
}

func TestStore_ListFeeds_Sorting(t *testing.T) {
	s := setupStore(t)
	ctx := context.Background()

	// 1. Create Feed 1
	feed1ID := uuid.NewString()
	_, err := s.CreateFeed(ctx, store.CreateFeedParams{
		ID:  feed1ID,
		Url: "http://example.com/feed1.xml",
		Title: func() *string { s := "Feed 1"; return &s }(),
	})
	require.NoError(t, err)

	// Sleep to ensure timestamp difference (SQLite CURRENT_TIMESTAMP resolution is 1s usually, but might be less in memory?)
	// Actually, let's update it explicitly to be sure or check if they differ.
	// Or we can manipulate the DB directly to set timestamps if needed.
	// Let's try creating Feed 2.
	time.Sleep(1100 * time.Millisecond) // Wait > 1s for safe measure with SQLite default

	// 2. Create Feed 2
	feed2ID := uuid.NewString()
	_, err = s.CreateFeed(ctx, store.CreateFeedParams{
		ID:  feed2ID,
		Url: "http://example.com/feed2.xml",
		Title: func() *string { s := "Feed 2"; return &s }(),
	})
	require.NoError(t, err)

	// 3. List Feeds ASC (Default/Explicit)
	t.Run("List Feeds ASC", func(t *testing.T) {
		feeds, err := s.ListFeeds(ctx, store.ListFeedsParams{
			SortDescending: false,
		})
		require.NoError(t, err)
		require.Len(t, feeds, 2)
		assert.Equal(t, feed1ID, feeds[0].ID)
		assert.Equal(t, feed2ID, feeds[1].ID)
	})

	// 4. List Feeds DESC
	t.Run("List Feeds DESC", func(t *testing.T) {
		feeds, err := s.ListFeeds(ctx, store.ListFeedsParams{
			SortDescending: true,
		})
		require.NoError(t, err)
		require.Len(t, feeds, 2)
		assert.Equal(t, feed2ID, feeds[0].ID)
		assert.Equal(t, feed1ID, feeds[1].ID)
	})
}