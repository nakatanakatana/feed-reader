package store_test

import (
	"context"
	"testing"

	"github.com/nakatanakatana/feed-reader/store"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestTags_UnreadCounts(t *testing.T) {
	q, _ := setupDB(t)
	ctx := context.Background()

	// Setup: 2 Tags
	_, err := q.CreateTag(ctx, store.CreateTagParams{ID: "tag-1", Name: "Tech"})
	require.NoError(t, err)
	_, err = q.CreateTag(ctx, store.CreateTagParams{ID: "tag-2", Name: "News"})
	require.NoError(t, err)

	// Setup: 2 Feeds
	_, err = q.CreateFeed(ctx, store.CreateFeedParams{ID: "feed-1", Url: "url-1"})
	require.NoError(t, err)
	_, err = q.CreateFeed(ctx, store.CreateFeedParams{ID: "feed-2", Url: "url-2"})
	require.NoError(t, err)

	// Associate Tag 1 with Feed 1, Tag 2 with Feed 2
	err = q.CreateFeedTag(ctx, store.CreateFeedTagParams{FeedID: "feed-1", TagID: "tag-1"})
	require.NoError(t, err)
	err = q.CreateFeedTag(ctx, store.CreateFeedTagParams{FeedID: "feed-2", TagID: "tag-2"})
	require.NoError(t, err)

	// Create Items
	// Item 1 in Feed 1 (Tag 1) - Unread
	_, err = q.CreateItem(ctx, store.CreateItemParams{ID: "item-1", Url: "item-url-1"})
	require.NoError(t, err)
	err = q.CreateFeedItem(ctx, store.CreateFeedItemParams{FeedID: "feed-1", ItemID: "item-1"})
	require.NoError(t, err)

	// Item 2 in Feed 1 (Tag 1) - Unread
	_, err = q.CreateItem(ctx, store.CreateItemParams{ID: "item-2", Url: "item-url-2"})
	require.NoError(t, err)
	err = q.CreateFeedItem(ctx, store.CreateFeedItemParams{FeedID: "feed-1", ItemID: "item-2"})
	require.NoError(t, err)

	// Item 3 in Feed 2 (Tag 2) - Unread
	_, err = q.CreateItem(ctx, store.CreateItemParams{ID: "item-3", Url: "item-url-3"})
	require.NoError(t, err)
	err = q.CreateFeedItem(ctx, store.CreateFeedItemParams{FeedID: "feed-2", ItemID: "item-3"})
	require.NoError(t, err)

	// Item 4 in Feed 2 (Tag 2) - Read
	_, err = q.CreateItem(ctx, store.CreateItemParams{ID: "item-4", Url: "item-url-4"})
	require.NoError(t, err)
	err = q.CreateFeedItem(ctx, store.CreateFeedItemParams{FeedID: "feed-2", ItemID: "item-4"})
	require.NoError(t, err)
	_, err = q.SetItemRead(ctx, store.SetItemReadParams{ItemID: "item-4", IsRead: 1})
	require.NoError(t, err)

	t.Run("CountTotalUnreadItems", func(t *testing.T) {
		count, err := q.CountTotalUnreadItems(ctx)
		require.NoError(t, err)
		assert.Equal(t, int64(3), count) // item-1, item-2, item-3
	})

	t.Run("CountUnreadItemsPerTag", func(t *testing.T) {
		counts, err := q.CountUnreadItemsPerTag(ctx)
		require.NoError(t, err)
		assert.Len(t, counts, 2)

		countMap := make(map[string]int64)
		for _, c := range counts {
			countMap[c.TagID] = c.Count
		}

		assert.Equal(t, int64(2), countMap["tag-1"]) // item-1, item-2
		assert.Equal(t, int64(1), countMap["tag-2"]) // item-3
	})
}

func TestStore_ListTags_WithUnreadCount(t *testing.T) {
	q, s := setupDB(t)
	ctx := context.Background()

	// Setup: 2 Tags
	_, _ = q.CreateTag(ctx, store.CreateTagParams{ID: "tag-1", Name: "Tech"})
	_, _ = q.CreateTag(ctx, store.CreateTagParams{ID: "tag-2", Name: "News"})

	// Setup: 2 Feeds
	_, _ = q.CreateFeed(ctx, store.CreateFeedParams{ID: "feed-1", Url: "url-1"})
	_, _ = q.CreateFeed(ctx, store.CreateFeedParams{ID: "feed-2", Url: "url-2"})

	_ = q.CreateFeedTag(ctx, store.CreateFeedTagParams{FeedID: "feed-1", TagID: "tag-1"})
	_ = q.CreateFeedTag(ctx, store.CreateFeedTagParams{FeedID: "feed-2", TagID: "tag-2"})

	// Item 1 in Tag 1 - Unread
	_, _ = q.CreateItem(ctx, store.CreateItemParams{ID: "item-1", Url: "item-url-1"})
	_ = q.CreateFeedItem(ctx, store.CreateFeedItemParams{FeedID: "feed-1", ItemID: "item-1"})

	// Item 2 in Tag 2 - Unread
	_, _ = q.CreateItem(ctx, store.CreateItemParams{ID: "item-2", Url: "item-url-2"})
	_ = q.CreateFeedItem(ctx, store.CreateFeedItemParams{FeedID: "feed-2", ItemID: "item-2"})

	// Item 3 in Tag 2 - Read
	_, _ = q.CreateItem(ctx, store.CreateItemParams{ID: "item-3", Url: "item-url-3"})
	_ = q.CreateFeedItem(ctx, store.CreateFeedItemParams{FeedID: "feed-2", ItemID: "item-3"})
	_, _ = q.SetItemRead(ctx, store.SetItemReadParams{ItemID: "item-3", IsRead: 1})

	t.Run("ListTags should include UnreadCount", func(t *testing.T) {
		tags, err := s.ListTags(ctx, store.ListTagsParams{})
		require.NoError(t, err)
		require.Len(t, tags, 2)

		tagMap := make(map[string]store.TagWithCount)
		for _, tag := range tags {
			tagMap[tag.ID] = tag
		}

		// Check unread counts
		assert.Equal(t, int64(1), tagMap["tag-1"].UnreadCount)
		assert.Equal(t, int64(1), tagMap["tag-2"].UnreadCount)
	})
}

