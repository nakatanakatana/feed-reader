package store_test

import (
	"context"
	"fmt"
	"testing"

	"github.com/google/uuid"
	"github.com/nakatanakatana/feed-reader/store"
	"gotest.tools/v3/assert"
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
	assert.NilError(t, err)

	feed2ID := uuid.NewString()
	_, err = s.CreateFeed(ctx, store.CreateFeedParams{
		ID:  feed2ID,
		Url: "http://example.com/feed2.xml",
	})
	assert.NilError(t, err)

	// 2. Save the same item to both feeds
	itemURL := "http://example.com/item1"
	itemTitle := "Duplicate Item"

	err = s.SaveFetchedItem(ctx, store.SaveFetchedItemParams{
		FeedID: feed1ID,
		Url:    itemURL,
		Title:  &itemTitle,
	})
	assert.NilError(t, err)

	err = s.SaveFetchedItem(ctx, store.SaveFetchedItemParams{
		FeedID: feed2ID,
		Url:    itemURL,
		Title:  &itemTitle,
	})
	assert.NilError(t, err)

	// 3. Verify duplicates in ListItems
	t.Run("ListItems should not have duplicates", func(t *testing.T) {
		items, err := s.ListItems(ctx, store.ListItemsParams{Limit: 10, Offset: 0})
		assert.NilError(t, err)

		// If deduplication is NOT working, this will likely be 2
		assert.Equal(t, len(items), 1, "Should return only 1 item even if it belongs to multiple feeds")
	})

	t.Run("CountItems should not count duplicates", func(t *testing.T) {
		count, err := s.CountItems(ctx, store.CountItemsParams{})
		assert.NilError(t, err)

		// If deduplication is NOT working, this will likely be 2
		assert.Equal(t, count, int64(1), "Should count only unique items")
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
		for i := range feedCount {
			feedID := uuid.NewString()
			feedIDs[i] = feedID
			_, err := s.CreateFeed(ctx, store.CreateFeedParams{
				ID:  feedID,
				Url: "http://example.com/feed/" + feedID,
			})
			assert.NilError(t, err)
		}

		itemCount := rapid.IntRange(1, 10).Draw(t, "itemCount")
		itemURLs := make([]string, itemCount)
		for i := range itemCount {
			itemURLs[i] = "http://example.com/item/" + uuid.NewString()
		}

		uniqueURLs := make(map[string]struct{}, itemCount)
		for i := range feedCount {
			itemsForFeed := rapid.IntRange(1, itemCount).Draw(t, fmt.Sprintf("itemsForFeed-%d", i))
			for j := range itemsForFeed {
				index := rapid.IntRange(0, itemCount-1).Draw(t, fmt.Sprintf("itemIndex-%d-%d", i, j))
				itemURL := itemURLs[index]
				title := fmt.Sprintf("Item %d", index)
				err := s.SaveFetchedItem(ctx, store.SaveFetchedItemParams{
					FeedID: feedIDs[i],
					Url:    itemURL,
					Title:  &title,
				})
				assert.NilError(t, err)
				uniqueURLs[itemURL] = struct{}{}
			}
		}

		items, err := s.ListItems(ctx, store.ListItemsParams{Limit: 1000, Offset: 0})
		assert.NilError(t, err)

		count, err := s.CountItems(ctx, store.CountItemsParams{})
		assert.NilError(t, err)

		assert.Equal(t, len(items), len(uniqueURLs))
		assert.Equal(t, count, int64(len(uniqueURLs)))
	})
}
