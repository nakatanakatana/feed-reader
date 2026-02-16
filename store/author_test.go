package store_test

import (
	"context"
	"testing"

	"github.com/google/uuid"
	"github.com/nakatanakatana/feed-reader/store"
	"google.golang.org/protobuf/proto"
	"gotest.tools/v3/assert"
)

func TestStore_AuthorField(t *testing.T) {
	s := setupStore(t)
	ctx := context.Background()

	// Setup Feed
	feedID := uuid.NewString()
	_, err := s.CreateFeed(ctx, store.CreateFeedParams{
		ID:  feedID,
		Url: "http://example.com/feed",
	})
	assert.NilError(t, err)

	// Use SaveFetchedItem
	err = s.SaveFetchedItem(ctx, store.SaveFetchedItemParams{
		FeedID: feedID,
		Url:    "http://example.com/item-with-author",
		Title:  proto.String("Title"),
		Authors: []store.AuthorParams{
			{Name: "Author Name"},
		},
	})
	assert.NilError(t, err)

	// Get ID
	var itemID string
	err = s.DB.QueryRowContext(ctx, "SELECT id FROM items WHERE url = ?", "http://example.com/item-with-author").Scan(&itemID)
	assert.NilError(t, err)

	// Use GetItem
	_, err = s.GetItem(ctx, itemID)
	assert.NilError(t, err)
}
