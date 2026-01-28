package store_test

import (
	"context"
	"testing"

	"github.com/google/uuid"
	"github.com/nakatanakatana/feed-reader/store"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestStore_ItemDeduplication(t *testing.T) {
	s := setupStore(t)
	ctx := context.Background()

	// 1. Setup two feeds
	feed1ID := uuid.NewString()
	_, err := s.CreateFeed(ctx, store.CreateFeedParams{
		ID:  feed1ID,
		Url: "http://example.com/feed1.xml",
	})
	require.NoError(t, err)

	feed2ID := uuid.NewString()
	_, err = s.CreateFeed(ctx, store.CreateFeedParams{
		ID:  feed2ID,
		Url: "http://example.com/feed2.xml",
	})
	require.NoError(t, err)

	// 2. Save the same item to both feeds
	itemURL := "http://example.com/item1"
	itemTitle := "Duplicate Item"
	
	err = s.SaveFetchedItem(ctx, store.SaveFetchedItemParams{
		FeedID: feed1ID,
		Url:    itemURL,
		Title:  &itemTitle,
	})
	require.NoError(t, err)

	err = s.SaveFetchedItem(ctx, store.SaveFetchedItemParams{
		FeedID: feed2ID,
		Url:    itemURL,
		Title:  &itemTitle,
	})
	require.NoError(t, err)

	// 3. Verify duplicates in ListItems
	t.Run("ListItems should not have duplicates", func(t *testing.T) {
		items, err := s.ListItems(ctx, store.ListItemsParams{Limit: 10, Offset: 0})
		require.NoError(t, err)
		
		// If deduplication is NOT working, this will likely be 2
		assert.Equal(t, 1, len(items), "Should return only 1 item even if it belongs to multiple feeds")
	})

	t.Run("CountItems should not count duplicates", func(t *testing.T) {
		count, err := s.CountItems(ctx, store.CountItemsParams{})
		require.NoError(t, err)
		
		// If deduplication is NOT working, this will likely be 2
		assert.Equal(t, int64(1), count, "Should count only unique items")
	})
}
