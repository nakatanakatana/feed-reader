package store_test

import (
	"context"
	"testing"

	"github.com/google/uuid"
	"github.com/nakatanakatana/feed-reader/store"
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
	author := "Author Name"
	err = s.SaveFetchedItem(ctx, store.SaveFetchedItemParams{
		FeedID: feedID,
		Url:    "http://example.com/item-with-author",
		Title:  new("Title"),
		Author: &author,
	})
	assert.NilError(t, err)

	// Get ID
	var itemID string
	err = s.DB.QueryRowContext(ctx, "SELECT id FROM items WHERE url = ?", "http://example.com/item-with-author").Scan(&itemID)
	assert.NilError(t, err)

	// Use GetItem
	got, err := s.GetItem(ctx, itemID)
	assert.NilError(t, err)
	assert.Equal(t, *got.Author, author)
}
