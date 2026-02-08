package store_test

import (
	"context"
	"database/sql"
	"testing"
	"time"

	schema "github.com/nakatanakatana/feed-reader/sql"
	"github.com/nakatanakatana/feed-reader/store"
	_ "github.com/ncruces/go-sqlite3/driver"
	_ "github.com/ncruces/go-sqlite3/embed"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestItemStore_GetItems_Features(t *testing.T) {
	db, err := sql.Open("sqlite3", ":memory:")
	require.NoError(t, err)
	defer func() { _ = db.Close() }()

	// Apply schema
	_, err = db.ExecContext(context.Background(), schema.Schema)
	require.NoError(t, err)

	q := store.New(db)
	ctx := context.Background()

	t.Run("Verify Schema Columns", func(t *testing.T) {
		expectedColumns := []string{"content", "image_url", "categories"}
		for _, col := range expectedColumns {
			row := db.QueryRow("SELECT name FROM pragma_table_info('items') WHERE name = ?", col)
			var name string
			err := row.Scan(&name)
			require.NoError(t, err, "Column %s is missing", col)
			assert.Equal(t, col, name)
		}
	})

	t.Run("Verify Storage of New Fields", func(t *testing.T) {
		content := "<h1>Content</h1>"
		imageURL := "http://example.com/image.jpg"
		categories := `["tech", "news"]`

		item, err := q.CreateItem(ctx, store.CreateItemParams{
			ID:          "item-new-fields",
			Url:         "http://example.com/new-fields",
			Title:       stringPtr("Title"),
			Content:     stringPtr(content),
			ImageUrl:    stringPtr(imageURL),
			Categories:  stringPtr(categories),
			PublishedAt: stringPtr(time.Now().Format(time.RFC3339)),
		})
		require.NoError(t, err)

		assert.Equal(t, content, *item.Content)
		assert.Equal(t, imageURL, *item.ImageUrl)
		assert.Equal(t, categories, *item.Categories)

		// Verify GetItem retrieves them
		// Use CreateFeedItem to link it first (though GetItem logic uses feed_items join? Yes)
		_, err = q.CreateFeed(ctx, store.CreateFeedParams{ID: "feed-1", Url: "http://f.com"})
		require.NoError(t, err)
		err = q.CreateFeedItem(ctx, store.CreateFeedItemParams{FeedID: "feed-1", ItemID: "item-new-fields"})
		require.NoError(t, err)

		got, err := q.GetItem(ctx, "item-new-fields")
		require.NoError(t, err)
		assert.Equal(t, content, *got.Content)
		assert.Equal(t, imageURL, *got.ImageUrl)
		assert.Equal(t, categories, *got.Categories)
	})

	t.Run("Verify CountUnreadItemsPerFeed", func(t *testing.T) {
		// Setup: Feed 1 has 2 items (1 read, 1 unread)
		//        Feed 2 has 1 item (1 unread)

		feed1 := "feed-count-1"
		feed2 := "feed-count-2"

		_, err := q.CreateFeed(ctx, store.CreateFeedParams{ID: feed1, Url: "http://f1.com"})
		require.NoError(t, err)
		_, err = q.CreateFeed(ctx, store.CreateFeedParams{ID: feed2, Url: "http://f2.com"})
		require.NoError(t, err)

		// Items for Feed 1
		createItem(t, q, ctx, "i1-1", "u1", feed1) // Unread
		createItem(t, q, ctx, "i1-2", "u2", feed1) // Read

		// Items for Feed 2
		createItem(t, q, ctx, "i2-1", "u3", feed2) // Unread

		// Mark i1-2 as read
		err = q.CreateItemRead(ctx, "i1-2")
		require.NoError(t, err)
		_, err = q.SetItemRead(ctx, store.SetItemReadParams{ItemID: "i1-2", IsRead: 1})
		require.NoError(t, err)

		counts, err := q.CountUnreadItemsPerFeed(ctx)
		require.NoError(t, err)

		countsMap := make(map[string]int64)
		for _, c := range counts {
			countsMap[c.FeedID] = c.Count
		}

		assert.Equal(t, int64(1), countsMap[feed1])
		assert.Equal(t, int64(1), countsMap[feed2])
	})
}

func createItem(t *testing.T, q *store.Queries, ctx context.Context, id, url, feedID string) {
	_, err := q.CreateItem(ctx, store.CreateItemParams{ID: id, Url: url})
	require.NoError(t, err)
	err = q.CreateFeedItem(ctx, store.CreateFeedItemParams{FeedID: feedID, ItemID: id})
	require.NoError(t, err)
}
