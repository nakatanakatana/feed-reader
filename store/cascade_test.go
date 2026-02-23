package store_test

import (
	"context"
	"testing"
	"time"

	"github.com/google/uuid"
	schema "github.com/nakatanakatana/feed-reader/sql"
	"github.com/nakatanakatana/feed-reader/store"
	"gotest.tools/v3/assert"
	_ "modernc.org/sqlite"
)

func TestCascadeDeletion(t *testing.T) {
	// Setup
	db, err := store.OpenDB(":memory:")
	assert.NilError(t, err)
	defer func() { _ = db.Close() }()

	_, err = db.ExecContext(context.Background(), schema.Schema)
	assert.NilError(t, err)

	s := store.NewStore(db)
	ctx := context.Background()

	t.Run("Delete Feed cascades to related records", func(t *testing.T) {
		// 1. Create Feed
		feedID := uuid.NewString()
		_, err = s.CreateFeed(ctx, store.CreateFeedParams{
			ID:    feedID,
			Url:   "http://example.com/feed.xml",
			Title: func() *string { s := "Feed 1"; return &s }(),
		})
		assert.NilError(t, err)

		// 2. Add related records
		// Feed Fetcher
		_, err = db.ExecContext(ctx, "INSERT INTO feed_fetcher (feed_id, etag, last_modified) VALUES (?, 'etag-1', '2023-01-01')", feedID)
		assert.NilError(t, err)

		// Tag and link to Feed
		tagID := uuid.NewString()
		_, err = s.CreateTag(ctx, store.CreateTagParams{ID: tagID, Name: "tech"})
		assert.NilError(t, err)
		err = s.CreateFeedTag(ctx, store.CreateFeedTagParams{FeedID: feedID, TagID: tagID})
		assert.NilError(t, err)

		// Item and link to Feed
		itemID := uuid.NewString()
		_, err = s.CreateItem(ctx, store.CreateItemParams{ID: itemID, Url: "http://e.com/1", Title: func() *string { s := "A1"; return &s }()})
		assert.NilError(t, err)
		err = s.CreateFeedItem(ctx, store.CreateFeedItemParams{
			FeedID:      feedID,
			ItemID:      itemID,
			PublishedAt: func() *string { t := time.Now().Format(time.RFC3339); return &t }(),
		})
		assert.NilError(t, err)

		// 3. Delete Feed
		_, err = db.ExecContext(ctx, "DELETE FROM feeds WHERE id = ?", feedID)
		assert.NilError(t, err)

		// 4. Assert cascading deletions
		var count int
		err = db.QueryRowContext(ctx, "SELECT count(*) FROM feed_fetcher WHERE feed_id = ?", feedID).Scan(&count)
		assert.NilError(t, err)
		assert.Equal(t, count, 0, "Feed Fetcher should be deleted")

		err = db.QueryRowContext(ctx, "SELECT count(*) FROM feed_tags WHERE feed_id = ?", feedID).Scan(&count)
		assert.NilError(t, err)
		assert.Equal(t, count, 0, "Feed Tags should be deleted")

		err = db.QueryRowContext(ctx, "SELECT count(*) FROM feed_items WHERE feed_id = ?", feedID).Scan(&count)
		assert.NilError(t, err)
		assert.Equal(t, count, 0, "Feed Items should be deleted")
	})

	t.Run("Delete Item cascades to related records", func(t *testing.T) {
		itemID := uuid.NewString()
		_, err = s.CreateItem(ctx, store.CreateItemParams{ID: itemID, Url: "http://e.com/2", Title: func() *string { s := "A2"; return &s }()})
		assert.NilError(t, err)

		// Add related records
		_, err = db.ExecContext(ctx, "INSERT INTO item_reads (item_id, read_at) VALUES (?, ?)", itemID, time.Now().Format(time.RFC3339))
		assert.NilError(t, err)

		ruleID := uuid.NewString()
		_, err = s.CreateItemBlockRule(ctx, store.CreateItemBlockRuleParams{
			ID:        ruleID,
			RuleType:  "url",
			RuleValue: "bad",
		})
		assert.NilError(t, err)
		_, err = db.ExecContext(ctx, "INSERT INTO item_blocks (item_id, rule_id) VALUES (?, ?)", itemID, ruleID)
		assert.NilError(t, err)

		// Delete Item
		_, err = db.ExecContext(ctx, "DELETE FROM items WHERE id = ?", itemID)
		assert.NilError(t, err)

		// Assert
		var count int
		err = db.QueryRowContext(ctx, "SELECT count(*) FROM item_reads WHERE item_id = ?", itemID).Scan(&count)
		assert.NilError(t, err)
		assert.Equal(t, count, 0, "Item Reads should be deleted")

		err = db.QueryRowContext(ctx, "SELECT count(*) FROM item_blocks WHERE item_id = ?", itemID).Scan(&count)
		assert.NilError(t, err)
		assert.Equal(t, count, 0, "Item Blocks should be deleted")
	})

	t.Run("Delete Tag cascades to feed_tags", func(t *testing.T) {
		tagID := uuid.NewString()
		_, err = s.CreateTag(ctx, store.CreateTagParams{ID: tagID, Name: "to-delete"})
		assert.NilError(t, err)

		feedID := uuid.NewString()
		_, err = s.CreateFeed(ctx, store.CreateFeedParams{ID: feedID, Url: "http://e.com/f2"})
		assert.NilError(t, err)

		err = s.CreateFeedTag(ctx, store.CreateFeedTagParams{FeedID: feedID, TagID: tagID})
		assert.NilError(t, err)

		// Delete Tag
		_, err = db.ExecContext(ctx, "DELETE FROM tags WHERE id = ?", tagID)
		assert.NilError(t, err)

		// Assert
		var count int
		err = db.QueryRowContext(ctx, "SELECT count(*) FROM feed_tags WHERE tag_id = ?", tagID).Scan(&count)
		assert.NilError(t, err)
		assert.Equal(t, count, 0, "Feed Tags should be deleted when tag is deleted")
	})

	t.Run("Delete Block Rule cascades to item_blocks", func(t *testing.T) {
		ruleID := uuid.NewString()
		_, err = s.CreateItemBlockRule(ctx, store.CreateItemBlockRuleParams{
			ID:        ruleID,
			RuleType:  "url",
			RuleValue: "blocked",
		})
		assert.NilError(t, err)

		itemID := uuid.NewString()
		_, err = s.CreateItem(ctx, store.CreateItemParams{ID: itemID, Url: "http://e.com/3"})
		assert.NilError(t, err)

		_, err = db.ExecContext(ctx, "INSERT INTO item_blocks (item_id, rule_id) VALUES (?, ?)", itemID, ruleID)
		assert.NilError(t, err)

		// Delete Rule
		_, err = db.ExecContext(ctx, "DELETE FROM item_block_rules WHERE id = ?", ruleID)
		assert.NilError(t, err)

		// Assert
		var count int
		err = db.QueryRowContext(ctx, "SELECT count(*) FROM item_blocks WHERE rule_id = ?", ruleID).Scan(&count)
		assert.NilError(t, err)
		assert.Equal(t, count, 0, "Item Blocks should be deleted when rule is deleted")
	})
}
