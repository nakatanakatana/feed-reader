package store_test

import (
	"context"
	"database/sql"
	"testing"
	"time"

	_ "github.com/mattn/go-sqlite3"
	"github.com/nakatanakatana/feed-reader/sql"
	"github.com/nakatanakatana/feed-reader/store"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func setupDB(t *testing.T) *store.Queries {
	db, err := sql.Open("sqlite3", ":memory:")
	require.NoError(t, err)

	_, err = db.ExecContext(context.Background(), schema.Schema)
	require.NoError(t, err)

	t.Cleanup(func() {
		_ = db.Close()
	})

	return store.New(db)
}

func TestQueries_CreateItem(t *testing.T) {
	q := setupDB(t)
	ctx := context.Background()

	t.Run("Create new item", func(t *testing.T) {
		params := store.CreateItemParams{
			ID:          "item-1",
			Url:         "http://example.com/item1",
			Title:       stringPtr("Item 1"),
			Description: stringPtr("Description 1"),
			PublishedAt: stringPtr(time.Now().Format(time.RFC3339)),
			Guid:        stringPtr("guid-1"),
		}

		item, err := q.CreateItem(ctx, params)
		require.NoError(t, err)
		assert.Equal(t, params.ID, item.ID)
		assert.Equal(t, params.Url, item.Url)
		assert.Equal(t, params.Title, item.Title)
	})

	t.Run("Upsert existing item", func(t *testing.T) {
		// First create
		params := store.CreateItemParams{
			ID:          "item-2",
			Url:         "http://example.com/item2",
			Title:       stringPtr("Item 2"),
			Description: stringPtr("Description 2"),
		}
		_, err := q.CreateItem(ctx, params)
		require.NoError(t, err)

		// Upsert with new title
		newParams := store.CreateItemParams{
			ID:          "item-2-new-id-ignored",
			Url:         "http://example.com/item2", // Same URL
			Title:       stringPtr("Item 2 Updated"),
			Description: stringPtr("Description 2"),
		}
		item, err := q.CreateItem(ctx, newParams)
		require.NoError(t, err)
		assert.Equal(t, "Item 2 Updated", *item.Title)
		// ID should NOT change on conflict update for other fields, but since we use RETURNING *, it returns the row.
		// However, our query does ON CONFLICT(url) DO UPDATE ...
		// The ID in the WHERE clause of the update is implied by the conflict target.
		// Wait, the INSERT statement tries to insert a NEW ID.
		// SQLite ON CONFLICT UPDATE does NOT update the Primary Key unless specified.
		// So the ID should remain "item-2".

		// Let's verify the ID is still the original one by querying
		// But CreateItem returns the row. Let's see what it returns.
		// It returns the updated row.

		// ACTUALLY, checking the query:
		// INSERT INTO items (id, ...) VALUES (?, ...)
		// ON CONFLICT(url) DO UPDATE SET title = excluded.title ...
		// It does NOT update ID.

		// NOTE: In SQLite, if we insert with a different ID but same URL, and it conflicts on URL,
		// the row is updated. The ID remains the OLD ID.
		// The RETURNING clause should return the row as it exists after the update.

		assert.Equal(t, "item-2", item.ID)
	})
}

func TestQueries_CreateFeedItem(t *testing.T) {
	q := setupDB(t)
	ctx := context.Background()

	// Create Feed
	feedParams := store.CreateFeedParams{
		Uuid: "feed-1",
		Url:  "http://example.com/feed.xml",
	}
	_, err := q.CreateFeed(ctx, feedParams)
	require.NoError(t, err)

	// Create Item
	itemParams := store.CreateItemParams{
		ID:  "item-1",
		Url: "http://example.com/item1",
	}
	_, err = q.CreateItem(ctx, itemParams)
	require.NoError(t, err)

	t.Run("Link feed and item", func(t *testing.T) {
		err := q.CreateFeedItem(ctx, store.CreateFeedItemParams{
			FeedID: "feed-1",
			ItemID: "item-1",
		})
		require.NoError(t, err)
	})

	t.Run("Duplicate link should be ignored", func(t *testing.T) {
		err := q.CreateFeedItem(ctx, store.CreateFeedItemParams{
			FeedID: "feed-1",
			ItemID: "item-1",
		})
		require.NoError(t, err)
	})
}

func TestQueries_CreateItemRead(t *testing.T) {
	q := setupDB(t)
	ctx := context.Background()

	// Create Item
	itemParams := store.CreateItemParams{
		ID:  "item-1",
		Url: "http://example.com/item1",
	}
	_, err := q.CreateItem(ctx, itemParams)
	require.NoError(t, err)

	t.Run("Initialize item read status", func(t *testing.T) {
		err := q.CreateItemRead(ctx, "item-1")
		require.NoError(t, err)
	})

	t.Run("Duplicate initialization should be ignored", func(t *testing.T) {
		err := q.CreateItemRead(ctx, "item-1")
		require.NoError(t, err)
	})
}

func stringPtr(s string) *string {
	return &s
}
