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
	authors := []store.AuthorParams{
		{Name: "Author One", Email: proto.String("one@example.com")},
		{Name: "Author Two", Uri: proto.String("http://two.example.com")},
	}
	err = s.SaveFetchedItem(ctx, store.SaveFetchedItemParams{
		FeedID:  feedID,
		Url:     "http://example.com/item-with-authors",
		Title:   proto.String("Title"),
		Authors: authors,
	})
	assert.NilError(t, err)

	// Get ID
	var itemID string
	err = s.DB.QueryRowContext(ctx, "SELECT id FROM items WHERE url = ?", "http://example.com/item-with-authors").Scan(&itemID)
	assert.NilError(t, err)

	// Verify authors are saved via ListItemAuthors
	gotAuthors, err := s.ListItemAuthors(ctx, itemID)
	assert.NilError(t, err)
	assert.Equal(t, len(gotAuthors), 2)
	assert.Equal(t, gotAuthors[0].Name, "Author One")
	assert.Equal(t, *gotAuthors[0].Email, "one@example.com")
	assert.Equal(t, gotAuthors[1].Name, "Author Two")
	assert.Equal(t, *gotAuthors[1].Uri, "http://two.example.com")
}

func TestStore_GetItemWithAuthors(t *testing.T) {
	s := setupStore(t)
	ctx := context.Background()

	// Setup Feed
	feedID := uuid.NewString()
	_, err := s.CreateFeed(ctx, store.CreateFeedParams{
		ID:  feedID,
		Url: "http://example.com/feed",
	})
	assert.NilError(t, err)

	// Create item with authors
	authors := []store.AuthorParams{
		{Name: "Alice"},
		{Name: "Bob"},
	}
	err = s.SaveFetchedItem(ctx, store.SaveFetchedItemParams{
		FeedID:  feedID,
		Url:     "http://example.com/item1",
		Authors: authors,
	})
	assert.NilError(t, err)

	var itemID string
	err = s.DB.QueryRowContext(ctx, "SELECT id FROM items WHERE url = ?", "http://example.com/item1").Scan(&itemID)
	assert.NilError(t, err)

	// Test GetItemWithAuthors
	item, err := s.GetItemWithAuthors(ctx, itemID)
	assert.NilError(t, err)
	assert.Equal(t, item.Url, "http://example.com/item1")
	assert.Equal(t, len(item.Authors), 2)
	assert.Equal(t, item.Authors[0].Name, "Alice")
	assert.Equal(t, item.Authors[1].Name, "Bob")
}
