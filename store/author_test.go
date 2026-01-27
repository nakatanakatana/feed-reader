package store_test

import (
	"context"
	"testing"

	"github.com/google/uuid"
	"github.com/nakatanakatana/feed-reader/store"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"google.golang.org/protobuf/proto"
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
	require.NoError(t, err)

	// Use SaveFetchedItem
	author := "Author Name"
	err = s.SaveFetchedItem(ctx, store.SaveFetchedItemParams{
		FeedID: feedID,
		Url:    "http://example.com/item-with-author",
		Title:  proto.String("Title"),
		Author: &author,
	})
	require.NoError(t, err)

	// Get ID
	var itemID string
	err = s.DB.QueryRowContext(ctx, "SELECT id FROM items WHERE url = ?", "http://example.com/item-with-author").Scan(&itemID)
	require.NoError(t, err)

	// Use GetItem
	got, err := s.GetItem(ctx, itemID)
	require.NoError(t, err)
	assert.Equal(t, author, *got.Author)
}
