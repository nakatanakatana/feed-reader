package store_test

import (
	"context"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/nakatanakatana/feed-reader/store"
	"gotest.tools/v3/assert"
)

func TestStore_SaveFetchedItem_PublishedAt(t *testing.T) {
	s := setupStore(t)
	ctx := context.Background()

	// 1. Setup a Feed
	feedID := uuid.NewString()
	feedParams := store.CreateFeedParams{
		ID:  feedID,
		Url: "http://example.com/feed_pub.xml",
	}
	_, err := s.CreateFeed(ctx, feedParams)
	assert.NilError(t, err)

	// 2. Define Item Params with PublishedAt
	itemURL := "http://example.com/article/pub1"
	title := "Article Pub 1"
	pubAt := time.Now().Format(time.RFC3339)

	params := store.SaveFetchedItemParams{
		FeedID:      feedID,
		Url:         itemURL,
		Title:       &title,
		PublishedAt: &pubAt,
	}

	// 3. Save Item
	err = s.SaveFetchedItem(ctx, params)
	assert.NilError(t, err)

	// 4. Verify feed_items.published_at is set
	var itemID string
	err = s.DB.QueryRowContext(ctx, "SELECT id FROM items WHERE url = ?", itemURL).Scan(&itemID)
	assert.NilError(t, err)

	var storedPubAt *string
	err = s.DB.QueryRowContext(ctx, "SELECT published_at FROM feed_items WHERE feed_id = ? AND item_id = ?", feedID, itemID).Scan(&storedPubAt)
	assert.NilError(t, err)

	assert.Assert(t, storedPubAt != nil, "feed_items.published_at should not be nil")
	assert.Equal(t, *storedPubAt, pubAt, "feed_items.published_at should match input")

	// 5. Update with different PublishedAt (Same Feed)
	// We wait 1 sec to ensure distinct timestamp if using seconds resolution, 
	// though RFC3339 usually has enough precision.
	newPubAt := time.Now().Add(1 * time.Hour).Format(time.RFC3339)
	params.PublishedAt = &newPubAt
	err = s.SaveFetchedItem(ctx, params)
	assert.NilError(t, err)

	// Verify feed_items updated
	err = s.DB.QueryRowContext(ctx, "SELECT published_at FROM feed_items WHERE feed_id = ? AND item_id = ?", feedID, itemID).Scan(&storedPubAt)
	assert.NilError(t, err)
	assert.Equal(t, *storedPubAt, newPubAt, "feed_items.published_at should update")

	// Verify items.published_at NOT updated (Per requirement)
	var itemPubAt *string
	err = s.DB.QueryRowContext(ctx, "SELECT published_at FROM items WHERE id = ?", itemID).Scan(&itemPubAt)
	assert.NilError(t, err)
	assert.Equal(t, *itemPubAt, pubAt, "items.published_at should NOT update")
}
