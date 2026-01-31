package store_test

import (
	"context"
	"database/sql"
	"fmt"
	"testing"

	"github.com/nakatanakatana/feed-reader/sql"
	"github.com/nakatanakatana/feed-reader/store"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	_ "modernc.org/sqlite"
	"pgregory.net/rapid"
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
		assert.Equal(t, int64(1), tagMap["tag-1"].FeedCount)
		assert.Equal(t, int64(1), tagMap["tag-2"].FeedCount)
	})
}

func TestTags_UnreadCounts_PBT(t *testing.T) {
	rapid.Check(t, func(t *rapid.T) {
		q, db := setupQueriesForRapid(t)
		ctx := context.Background()
		defer func() {
			_ = db.Close()
		}()

		tagCount := rapid.IntRange(1, 5).Draw(t, "tagCount")
		feedIDs := make([]string, tagCount)
		tagIDs := make([]string, tagCount)
		for i := 0; i < tagCount; i++ {
			tagID := fmt.Sprintf("tag-%d", i)
			feedID := fmt.Sprintf("feed-%d", i)
			feedIDs[i] = feedID
			tagIDs[i] = tagID
			_, err := q.CreateTag(ctx, store.CreateTagParams{ID: tagID, Name: tagID})
			require.NoError(t, err)
			_, err = q.CreateFeed(ctx, store.CreateFeedParams{ID: feedID, Url: "url-" + feedID})
			require.NoError(t, err)
			err = q.CreateFeedTag(ctx, store.CreateFeedTagParams{FeedID: feedID, TagID: tagID})
			require.NoError(t, err)
		}

		itemCount := rapid.IntRange(1, 20).Draw(t, "itemCount")
		unreadPerFeed := make(map[string]int64, tagCount)
		for i := 0; i < itemCount; i++ {
			feedIndex := rapid.IntRange(0, tagCount-1).Draw(t, fmt.Sprintf("feedIndex-%d", i))
			feedID := feedIDs[feedIndex]
			itemID := fmt.Sprintf("item-%d", i)
			_, err := q.CreateItem(ctx, store.CreateItemParams{ID: itemID, Url: "item-url-" + itemID})
			require.NoError(t, err)
			err = q.CreateFeedItem(ctx, store.CreateFeedItemParams{FeedID: feedID, ItemID: itemID})
			require.NoError(t, err)

			if rapid.Bool().Draw(t, fmt.Sprintf("isRead-%d", i)) {
				_, err = q.SetItemRead(ctx, store.SetItemReadParams{ItemID: itemID, IsRead: 1})
				require.NoError(t, err)
			} else {
				unreadPerFeed[feedID]++
			}
		}

		perFeed, err := q.CountUnreadItemsPerFeed(ctx)
		require.NoError(t, err)
		perFeedMap := make(map[string]int64, len(perFeed))
		for _, row := range perFeed {
			perFeedMap[row.FeedID] = row.Count
		}

		perTag, err := q.CountUnreadItemsPerTag(ctx)
		require.NoError(t, err)
		perTagMap := make(map[string]int64, len(perTag))
		for _, row := range perTag {
			perTagMap[row.TagID] = row.Count
		}

		for i, feedID := range feedIDs {
			if got := perFeedMap[feedID]; got != unreadPerFeed[feedID] {
				t.Fatalf("expected unread count to match: feed=%s got=%d expected=%d", feedID, got, unreadPerFeed[feedID])
			}
			if got := perTagMap[tagIDs[i]]; got != unreadPerFeed[feedID] {
				t.Fatalf("expected tag count to match feed count: tag=%s got=%d expected=%d", tagIDs[i], got, unreadPerFeed[feedID])
			}
		}
	})
}

func setupQueriesForRapid(t *rapid.T) (*store.Queries, *sql.DB) {
	db, err := sql.Open("sqlite", ":memory:")
	if err != nil {
		t.Fatalf("failed to open sqlite db: %v", err)
	}

	_, err = db.ExecContext(context.Background(), schema.Schema)
	if err != nil {
		_ = db.Close()
		t.Fatalf("failed to apply schema: %v", err)
	}

	return store.New(db), db
}
