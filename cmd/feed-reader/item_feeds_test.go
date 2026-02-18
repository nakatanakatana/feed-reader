package main

import (
	"context"
	"testing"
	"time"

	"connectrpc.com/connect"
	"github.com/google/uuid"
	"github.com/nakatanakatana/feed-reader/gen/go/item/v1"
	"github.com/nakatanakatana/feed-reader/store"
	"gotest.tools/v3/assert"
)

func TestListItemFeeds(t *testing.T) {
	ctx := context.Background()
	queries, db := setupTestDB(t)
	s := store.NewStore(db)
	server := &ItemServer{store: s}

	// Setup Feed
	feedID := uuid.NewString()
	_, err := queries.CreateFeed(ctx, store.CreateFeedParams{
		ID:    feedID,
		Url:   "http://example.com/feed",
		Title: new("Example Feed"),
	})
	assert.NilError(t, err)

	// Create test item
	now := time.Now().UTC()
	pubAt := now.Add(-1 * time.Hour).Format(time.RFC3339)
	err = s.SaveFetchedItem(ctx, store.SaveFetchedItemParams{
		FeedID:      feedID,
		Url:         "http://example.com/item1",
		Title:       new("Item 1"),
		PublishedAt: &pubAt,
	})
	assert.NilError(t, err)

	var itemID string
	err = db.QueryRowContext(ctx, "SELECT id FROM items WHERE url = ?", "http://example.com/item1").Scan(&itemID)
	assert.NilError(t, err)

	t.Run("ListItemFeeds", func(t *testing.T) {
		res, err := server.ListItemFeeds(ctx, connect.NewRequest(&itemv1.ListItemFeedsRequest{ItemId: itemID}))
		assert.NilError(t, err)
		assert.Equal(t, len(res.Msg.Feeds), 1)
		assert.Equal(t, res.Msg.Feeds[0].FeedId, feedID)
		assert.Assert(t, res.Msg.Feeds[0].FeedTitle != nil)
		assert.Equal(t, *res.Msg.Feeds[0].FeedTitle, "Example Feed")
		assert.Assert(t, res.Msg.Feeds[0].PublishedAt != nil)
		assert.Equal(t, *res.Msg.Feeds[0].PublishedAt, pubAt)
	})
}
