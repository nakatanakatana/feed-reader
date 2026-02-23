package store_test

import (
	"context"
	"database/sql"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/nakatanakatana/feed-reader/sql"
	"github.com/nakatanakatana/feed-reader/store"
	"gotest.tools/v3/assert"
	_ "modernc.org/sqlite"
)

func TestDeleteFeed_Cascade(t *testing.T) {
	// Setup with foreign keys enabled
	db, err := sql.Open("sqlite", ":memory:?_pragma=foreign_keys(1)")
	assert.NilError(t, err)
	defer db.Close()

	_, err = db.ExecContext(context.Background(), schema.Schema)
	assert.NilError(t, err)

	s := store.NewStore(db)
	ctx := context.Background()

	// 1. Create Feed
	feedID := uuid.NewString()
	feedParams := store.CreateFeedParams{
		ID:    feedID,
		Url:   "http://example.com/feed.xml",
		Title: func() *string { s := "Feed 1"; return &s }(),
	}
	_, err = s.CreateFeed(ctx, feedParams)
	assert.NilError(t, err)

	// 2. Add Feed Fetcher (Simulate fetcher metadata)
	_, err = db.ExecContext(ctx, "INSERT INTO feed_fetcher (feed_id, etag, last_modified) VALUES (?, 'etag-1', '2023-01-01')", feedID)
	assert.NilError(t, err)

	// 3. Create Tag and link to Feed
	tagID := uuid.NewString()
	_, err = s.CreateTag(ctx, store.CreateTagParams{
		ID:   tagID,
		Name: "tech",
	})
	assert.NilError(t, err)

	err = s.CreateFeedTag(ctx, store.CreateFeedTagParams{
		FeedID: feedID,
		TagID:  tagID,
	})
	assert.NilError(t, err)

	// 4. Create Item and link to Feed
	itemID := uuid.NewString()
	itemURL := "http://example.com/article/1"
	title := "Article 1"
	_, err = s.CreateItem(ctx, store.CreateItemParams{
		ID:    itemID,
		Url:   itemURL,
		Title: &title,
	})
	assert.NilError(t, err)

	err = s.CreateFeedItem(ctx, store.CreateFeedItemParams{
		FeedID:      feedID,
		ItemID:      itemID,
		PublishedAt: func() *string { t := time.Now().Format(time.RFC3339); return &t }(),
	})
	assert.NilError(t, err)

	// 5. Delete Feed
	_, err = db.ExecContext(ctx, "DELETE FROM feeds WHERE id = ?", feedID)
	assert.NilError(t, err)

	// 6. Assert that related records ARE DELETED (proving cascade works)
	
	// Check Feed Fetcher
	var fetcherCount int
	err = db.QueryRowContext(ctx, "SELECT count(*) FROM feed_fetcher WHERE feed_id = ?", feedID).Scan(&fetcherCount)
	assert.NilError(t, err)
	assert.Equal(t, fetcherCount, 0, "Feed Fetcher should be deleted via cascade")

	// Check Feed Tags
	var feedTagCount int
	err = db.QueryRowContext(ctx, "SELECT count(*) FROM feed_tags WHERE feed_id = ?", feedID).Scan(&feedTagCount)
	assert.NilError(t, err)
	assert.Equal(t, feedTagCount, 0, "Feed Tags should be deleted via cascade")

	// Check Feed Items
	var feedItemCount int
	err = db.QueryRowContext(ctx, "SELECT count(*) FROM feed_items WHERE feed_id = ?", feedID).Scan(&feedItemCount)
	assert.NilError(t, err)
	assert.Equal(t, feedItemCount, 0, "Feed Items should be deleted via cascade")
}
