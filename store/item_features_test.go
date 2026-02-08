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
	"gotest.tools/v3/assert"
)

func TestItemStore_GetItems_Features(t *testing.T) {
	db, err := sql.Open("sqlite3", ":memory:")
	assert.NilError(t, err)
	defer func() { _ = db.Close() }()

	// Apply schema
	_, err = db.ExecContext(context.Background(), schema.Schema)
	assert.NilError(t, err)

	q := store.New(db)
	ctx := context.Background()

	t.Run("Verify Schema Columns", func(t *testing.T) {
		expectedColumns := []string{"content", "image_url", "categories"}
		for _, col := range expectedColumns {
			row := db.QueryRow("SELECT name FROM pragma_table_info('items') WHERE name = ?", col)
			var name string
			err := row.Scan(&name)
			assert.NilError(t, err, "Column %s is missing", col)
			assert.Equal(t, name, col)
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
		assert.NilError(t, err)

		assert.Equal(t, *item.Content, content)
		assert.Equal(t, *item.ImageUrl, imageURL)
		assert.Equal(t, *item.Categories, categories)

		// Verify GetItem retrieves them
		// Use CreateFeedItem to link it first (though GetItem logic uses feed_items join? Yes)
		_, err = q.CreateFeed(ctx, store.CreateFeedParams{ID: "feed-1", Url: "http://f.com"})
		assert.NilError(t, err)
		err = q.CreateFeedItem(ctx, store.CreateFeedItemParams{FeedID: "feed-1", ItemID: "item-new-fields"})
		assert.NilError(t, err)

		got, err := q.GetItem(ctx, "item-new-fields")
		assert.NilError(t, err)
		assert.Equal(t, *got.Content, content)
		assert.Equal(t, *got.ImageUrl, imageURL)
		assert.Equal(t, *got.Categories, categories)
	})

	t.Run("Verify CountUnreadItemsPerFeed", func(t *testing.T) {
		// Setup: Feed 1 has 2 items (1 read, 1 unread)
		//        Feed 2 has 1 item (1 unread)

		feed1 := "feed-count-1"
		feed2 := "feed-count-2"

		_, err := q.CreateFeed(ctx, store.CreateFeedParams{ID: feed1, Url: "http://f1.com"})
		assert.NilError(t, err)
		_, err = q.CreateFeed(ctx, store.CreateFeedParams{ID: feed2, Url: "http://f2.com"})
		assert.NilError(t, err)

		// Items for Feed 1
		createItemWithQ(t, q, ctx, "i1-1", "u1", feed1) // Unread
		createItemWithQ(t, q, ctx, "i1-2", "u2", feed1) // Read

		// Items for Feed 2
		createItemWithQ(t, q, ctx, "i2-1", "u3", feed2) // Unread

		// Mark i1-2 as read
		err = q.CreateItemRead(ctx, "i1-2")
		assert.NilError(t, err)
		_, err = q.SetItemRead(ctx, store.SetItemReadParams{ItemID: "i1-2", IsRead: 1})
		assert.NilError(t, err)

		counts, err := q.CountUnreadItemsPerFeed(ctx)
		assert.NilError(t, err)

		countsMap := make(map[string]int64)
		for _, c := range counts {
			countsMap[c.FeedID] = c.Count
		}

		assert.Equal(t, countsMap[feed1], int64(1))
		assert.Equal(t, countsMap[feed2], int64(1))
	})
}

func createItemWithQ(t *testing.T, q *store.Queries, ctx context.Context, id, url, feedID string) {
	_, err := q.CreateItem(ctx, store.CreateItemParams{ID: id, Url: url})
	assert.NilError(t, err)
	err = q.CreateFeedItem(ctx, store.CreateFeedItemParams{FeedID: feedID, ItemID: id})
	assert.NilError(t, err)
}
