package store_test

import (
	"context"
	"fmt"
	"testing"

	"github.com/google/uuid"
	"github.com/nakatanakatana/feed-reader/store"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"pgregory.net/rapid"
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

func TestStore_ItemDeduplication_PBT(t *testing.T) {
	rapid.Check(t, func(t *rapid.T) {
		s := setupStoreForRapid(t)
		ctx := context.Background()
		defer func() {
			_ = s.DB.Close()
		}()

		feedCount := rapid.IntRange(1, 5).Draw(t, "feedCount")
		feedIDs := make([]string, feedCount)
		for i := 0; i < feedCount; i++ {
			feedID := uuid.NewString()
			feedIDs[i] = feedID
			_, err := s.CreateFeed(ctx, store.CreateFeedParams{
				ID:  feedID,
				Url: "http://example.com/feed/" + feedID,
			})
			require.NoError(t, err)
		}

		itemCount := rapid.IntRange(1, 10).Draw(t, "itemCount")
		itemURLs := make([]string, itemCount)
		for i := 0; i < itemCount; i++ {
			itemURLs[i] = "http://example.com/item/" + uuid.NewString()
		}

		uniqueURLs := make(map[string]struct{}, itemCount)
		for i := 0; i < feedCount; i++ {
			itemsForFeed := rapid.IntRange(1, itemCount).Draw(t, fmt.Sprintf("itemsForFeed-%d", i))
			for j := 0; j < itemsForFeed; j++ {
				index := rapid.IntRange(0, itemCount-1).Draw(t, fmt.Sprintf("itemIndex-%d-%d", i, j))
				itemURL := itemURLs[index]
				title := fmt.Sprintf("Item %d", index)
				err := s.SaveFetchedItem(ctx, store.SaveFetchedItemParams{
					FeedID: feedIDs[i],
					Url:    itemURL,
					Title:  &title,
				})
				require.NoError(t, err)
				uniqueURLs[itemURL] = struct{}{}
			}
		}

		items, err := s.ListItems(ctx, store.ListItemsParams{Limit: 1000, Offset: 0})
		require.NoError(t, err)

		count, err := s.CountItems(ctx, store.CountItemsParams{})
		require.NoError(t, err)

		if len(items) != len(uniqueURLs) {
			t.Fatalf("expected unique item count: len(items)=%d unique=%d", len(items), len(uniqueURLs))
		}
		if count != int64(len(uniqueURLs)) {
			t.Fatalf("expected count to match unique items: count=%d unique=%d", count, len(uniqueURLs))
		}
	})
}
