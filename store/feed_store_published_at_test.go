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
	// Create a distinct timestamp by adding 1 hour to the current time.
	// This ensures a different value even if using seconds resolution.
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

func TestStore_SaveFetchedItem_PublishedAt_MultipleFeeds(t *testing.T) {
	s := setupStore(t)
	ctx := context.Background()

	// 1. Setup two Feeds
	feedAID := uuid.NewString()
	feedAParams := store.CreateFeedParams{
		ID:  feedAID,
		Url: "http://example.com/feedA_pub.xml",
	}
	_, err := s.CreateFeed(ctx, feedAParams)
	assert.NilError(t, err)

	feedBID := uuid.NewString()
	feedBParams := store.CreateFeedParams{
		ID:  feedBID,
		Url: "http://example.com/feedB_pub.xml",
	}
	_, err = s.CreateFeed(ctx, feedBParams)
	assert.NilError(t, err)

	// 2. Shared Item URL, different PublishedAt per feed
	itemURL := "http://example.com/article/shared"
	title := "Shared Article"
	pubAtA := time.Now().Add(-1 * time.Hour).Format(time.RFC3339)
	pubAtB := time.Now().Add(2 * time.Hour).Format(time.RFC3339)

	// 3. Save item for Feed A
	paramsA := store.SaveFetchedItemParams{
		FeedID:      feedAID,
		Url:         itemURL,
		Title:       &title,
		PublishedAt: &pubAtA,
	}
	err = s.SaveFetchedItem(ctx, paramsA)
	assert.NilError(t, err)

	// 4. Verify item exists and Feed A's published_at is set
	var itemID string
	err = s.DB.QueryRowContext(ctx, "SELECT id FROM items WHERE url = ?", itemURL).Scan(&itemID)
	assert.NilError(t, err)

	var feedAPubAt *string
	err = s.DB.QueryRowContext(ctx, "SELECT published_at FROM feed_items WHERE feed_id = ? AND item_id = ?", feedAID, itemID).Scan(&feedAPubAt)
	assert.NilError(t, err)
	assert.Assert(t, feedAPubAt != nil, "feed_items.published_at for Feed A should not be nil")
	assert.Equal(t, *feedAPubAt, pubAtA, "feed_items.published_at for Feed A should match input")

	// 5. Save same item URL for Feed B with different PublishedAt
	paramsB := store.SaveFetchedItemParams{
		FeedID:      feedBID,
		Url:         itemURL,
		Title:       &title,
		PublishedAt: &pubAtB,
	}
	err = s.SaveFetchedItem(ctx, paramsB)
	assert.NilError(t, err)

	// 6. Verify Feed B's published_at is independent and matches its input
	var feedBPubAt *string
	err = s.DB.QueryRowContext(ctx, "SELECT published_at FROM feed_items WHERE feed_id = ? AND item_id = ?", feedBID, itemID).Scan(&feedBPubAt)
	assert.NilError(t, err)
	assert.Assert(t, feedBPubAt != nil, "feed_items.published_at for Feed B should not be nil")
	assert.Equal(t, *feedBPubAt, pubAtB, "feed_items.published_at for Feed B should match its input")

	// 7. Verify Feed A's published_at is unchanged
	err = s.DB.QueryRowContext(ctx, "SELECT published_at FROM feed_items WHERE feed_id = ? AND item_id = ?", feedAID, itemID).Scan(&feedAPubAt)
	assert.NilError(t, err)
	assert.Equal(t, *feedAPubAt, pubAtA, "feed_items.published_at for Feed A should remain unchanged")

	// 8. Verify items.published_at NOT updated by second feed
	var itemPubAt *string
	err = s.DB.QueryRowContext(ctx, "SELECT published_at FROM items WHERE id = ?", itemID).Scan(&itemPubAt)
	assert.NilError(t, err)
	assert.Equal(t, *itemPubAt, pubAtA, "items.published_at should reflect first seen value and NOT update for another feed")
}
