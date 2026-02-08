package store_test

import (
	"context"
	"database/sql"
	"encoding/json"
	"testing"
	"time"

	"github.com/nakatanakatana/feed-reader/sql"
	"github.com/nakatanakatana/feed-reader/store"
	_ "github.com/ncruces/go-sqlite3/driver"
	_ "github.com/ncruces/go-sqlite3/embed"
	"gotest.tools/v3/assert"
	"gotest.tools/v3/golden"
)

func setupDB(t *testing.T) (*store.Queries, *store.Store) {
	db, err := sql.Open("sqlite3", ":memory:")
	assert.NilError(t, err)

	_, err = db.ExecContext(context.Background(), schema.Schema)
	assert.NilError(t, err)

	t.Cleanup(func() {
		_ = db.Close()
	})

	return store.New(db), store.NewStore(db)
}

func maskJSON(t *testing.T, data interface{}) string {
	b, err := json.Marshal(data)
	assert.NilError(t, err)

	var m interface{}
	err = json.Unmarshal(b, &m)
	assert.NilError(t, err)

	mask(m)

	b, err = json.MarshalIndent(m, "", "  ")
	assert.NilError(t, err)
	return string(b)
}

func mask(i interface{}) {
	switch v := i.(type) {
	case map[string]interface{}:
		for k, val := range v {
			if k == "created_at" || k == "updated_at" || k == "published_at" || k == "read_at" || k == "last_fetched_at" {
				if val != nil {
					v[k] = "MASKED"
				}
			} else {
				mask(val)
			}
		}
	case []interface{}:
		for _, val := range v {
			mask(val)
		}
	}
}

func TestQueries_CreateItem(t *testing.T) {
	q, _ := setupDB(t)
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
		assert.NilError(t, err)

		golden.Assert(t, maskJSON(t, item), "create_item_new.golden")
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
		assert.NilError(t, err)

		// Upsert with new title
		newParams := store.CreateItemParams{
			ID:          "item-2-new-id-ignored",
			Url:         "http://example.com/item2", // Same URL
			Title:       stringPtr("Item 2 Updated"),
			Description: stringPtr("Description 2"),
		}
		item, err := q.CreateItem(ctx, newParams)
		assert.NilError(t, err)

		golden.Assert(t, maskJSON(t, item), "create_item_upsert.golden")
	})
}

func TestQueries_CreateFeedItem(t *testing.T) {
	q, _ := setupDB(t)
	ctx := context.Background()

	// Create Feed
	feedParams := store.CreateFeedParams{
		ID:  "feed-1",
		Url: "http://example.com/feed.xml",
	}
	_, err := q.CreateFeed(ctx, feedParams)
	assert.NilError(t, err)

	// Create Item
	itemParams := store.CreateItemParams{
		ID:  "item-1",
		Url: "http://example.com/item1",
	}
	_, err = q.CreateItem(ctx, itemParams)
	assert.NilError(t, err)

	t.Run("Link feed and item", func(t *testing.T) {
		err := q.CreateFeedItem(ctx, store.CreateFeedItemParams{
			FeedID: "feed-1",
			ItemID: "item-1",
		})
		assert.NilError(t, err)
	})

	t.Run("Duplicate link should be ignored", func(t *testing.T) {
		err := q.CreateFeedItem(ctx, store.CreateFeedItemParams{
			FeedID: "feed-1",
			ItemID: "item-1",
		})
		assert.NilError(t, err)
	})

	t.Run("ListItems returns CreatedAt", func(t *testing.T) {
		items, err := q.ListItems(ctx, store.ListItemsParams{
			Limit: 10,
		})
		assert.NilError(t, err)
		golden.Assert(t, maskJSON(t, items), "list_items_with_created_at.golden")
	})
}

func TestQueries_CreateItemRead(t *testing.T) {
	q, _ := setupDB(t)
	ctx := context.Background()

	// Create Item
	itemParams := store.CreateItemParams{
		ID:  "item-1",
		Url: "http://example.com/item1",
	}
	_, err := q.CreateItem(ctx, itemParams)
	assert.NilError(t, err)

	t.Run("Initialize item read status", func(t *testing.T) {
		err := q.CreateItemRead(ctx, "item-1")
		assert.NilError(t, err)
	})

	t.Run("Duplicate initialization should be ignored", func(t *testing.T) {
		err := q.CreateItemRead(ctx, "item-1")
		assert.NilError(t, err)
	})
}

func stringPtr(s string) *string {
	return &s
}
