package store_test

import (
	"context"
	"database/sql"
	"fmt"
	"testing"

	"github.com/nakatanakatana/feed-reader/sql"
	"github.com/nakatanakatana/feed-reader/store"
	"gotest.tools/v3/assert"
	"gotest.tools/v3/assert/cmp"
	_ "modernc.org/sqlite"
	"pgregory.net/rapid"
)

func TestTags_UnreadCounts(t *testing.T) {
	q, _ := setupDB(t)
	ctx := context.Background()

	// Setup: 2 Tags
	_, err := q.CreateTag(ctx, store.CreateTagParams{ID: "tag-1", Name: "Tech"})
	assert.NilError(t, err)
	_, err = q.CreateTag(ctx, store.CreateTagParams{ID: "tag-2", Name: "News"})
	assert.NilError(t, err)

	// Setup: 2 Feeds
	_, err = q.CreateFeed(ctx, store.CreateFeedParams{ID: "feed-1", Url: "url-1"})
	assert.NilError(t, err)
	_, err = q.CreateFeed(ctx, store.CreateFeedParams{ID: "feed-2", Url: "url-2"})
	assert.NilError(t, err)

	// Associate Tag 1 with Feed 1, Tag 2 with Feed 2
	err = q.CreateFeedTag(ctx, store.CreateFeedTagParams{FeedID: "feed-1", TagID: "tag-1"})
	assert.NilError(t, err)
	err = q.CreateFeedTag(ctx, store.CreateFeedTagParams{FeedID: "feed-2", TagID: "tag-2"})
	assert.NilError(t, err)

	// Create Items
	// Item 1 in Feed 1 (Tag 1) - Unread
	_, err = q.CreateItem(ctx, store.CreateItemParams{ID: "item-1", Url: "item-url-1"})
	assert.NilError(t, err)
	err = q.CreateFeedItem(ctx, store.CreateFeedItemParams{FeedID: "feed-1", ItemID: "item-1"})
	assert.NilError(t, err)

	// Item 2 in Feed 1 (Tag 1) - Unread
	_, err = q.CreateItem(ctx, store.CreateItemParams{ID: "item-2", Url: "item-url-2"})
	assert.NilError(t, err)
	err = q.CreateFeedItem(ctx, store.CreateFeedItemParams{FeedID: "feed-1", ItemID: "item-2"})
	assert.NilError(t, err)

	// Item 3 in Feed 2 (Tag 2) - Unread
	_, err = q.CreateItem(ctx, store.CreateItemParams{ID: "item-3", Url: "item-url-3"})
	assert.NilError(t, err)
	err = q.CreateFeedItem(ctx, store.CreateFeedItemParams{FeedID: "feed-2", ItemID: "item-3"})
	assert.NilError(t, err)

	// Item 4 in Feed 2 (Tag 2) - Read
	_, err = q.CreateItem(ctx, store.CreateItemParams{ID: "item-4", Url: "item-url-4"})
	assert.NilError(t, err)
	err = q.CreateFeedItem(ctx, store.CreateFeedItemParams{FeedID: "feed-2", ItemID: "item-4"})
	assert.NilError(t, err)
	_, err = q.SetItemRead(ctx, store.SetItemReadParams{ItemID: "item-4", IsRead: 1})
	assert.NilError(t, err)

	t.Run("CountTotalUnreadItems", func(t *testing.T) {
		count, err := q.CountTotalUnreadItems(ctx)
		assert.NilError(t, err)
		assert.Equal(t, count, int64(3)) // item-1, item-2, item-3
	})

	t.Run("CountUnreadItemsPerTag", func(t *testing.T) {
		counts, err := q.CountUnreadItemsPerTag(ctx)
		assert.NilError(t, err)
		assert.Assert(t, cmp.Len(counts, 2))

		countMap := make(map[string]int64)
		for _, c := range counts {
			countMap[c.TagID] = c.Count
		}

		assert.Equal(t, countMap["tag-1"], int64(2)) // item-1, item-2
		assert.Equal(t, countMap["tag-2"], int64(1)) // item-3
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
		assert.NilError(t, err)
		assert.Assert(t, cmp.Len(tags, 2))

		tagMap := make(map[string]store.TagWithCount)
		for _, tag := range tags {
			tagMap[tag.ID] = tag
		}

		// Check unread counts
		assert.Equal(t, tagMap["tag-1"].UnreadCount, int64(1))
		assert.Equal(t, tagMap["tag-2"].UnreadCount, int64(1))
		assert.Equal(t, tagMap["tag-1"].FeedCount, int64(1))
		assert.Equal(t, tagMap["tag-2"].FeedCount, int64(1))
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
			assert.NilError(t, err)
			_, err = q.CreateFeed(ctx, store.CreateFeedParams{ID: feedID, Url: "url-" + feedID})
			assert.NilError(t, err)
			err = q.CreateFeedTag(ctx, store.CreateFeedTagParams{FeedID: feedID, TagID: tagID})
			assert.NilError(t, err)
		}

		itemCount := rapid.IntRange(1, 20).Draw(t, "itemCount")
		unreadPerFeed := make(map[string]int64, tagCount)
		for i := 0; i < itemCount; i++ {
			feedIndex := rapid.IntRange(0, tagCount-1).Draw(t, fmt.Sprintf("feedIndex-%d", i))
			feedID := feedIDs[feedIndex]
			itemID := fmt.Sprintf("item-%d", i)
			_, err := q.CreateItem(ctx, store.CreateItemParams{ID: itemID, Url: "item-url-" + itemID})
			assert.NilError(t, err)
			err = q.CreateFeedItem(ctx, store.CreateFeedItemParams{FeedID: feedID, ItemID: itemID})
			assert.NilError(t, err)

			if rapid.Bool().Draw(t, fmt.Sprintf("isRead-%d", i)) {
				_, err = q.SetItemRead(ctx, store.SetItemReadParams{ItemID: itemID, IsRead: 1})
				assert.NilError(t, err)
			} else {
				unreadPerFeed[feedID]++
			}
		}

		perFeed, err := q.CountUnreadItemsPerFeed(ctx)
		assert.NilError(t, err)
		perFeedMap := make(map[string]int64, len(perFeed))
		for _, row := range perFeed {
			perFeedMap[row.FeedID] = row.Count
		}

		perTag, err := q.CountUnreadItemsPerTag(ctx)
		assert.NilError(t, err)
		perTagMap := make(map[string]int64, len(perTag))
		for _, row := range perTag {
			perTagMap[row.TagID] = row.Count
		}

		for i, feedID := range feedIDs {
			assert.Equal(t, perFeedMap[feedID], unreadPerFeed[feedID], "expected unread count to match: feed=%s got=%d expected=%d", feedID, perFeedMap[feedID], unreadPerFeed[feedID])
			assert.Equal(t, perTagMap[tagIDs[i]], unreadPerFeed[feedID], "expected tag count to match feed count: tag=%s got=%d expected=%d", tagIDs[i], perTagMap[tagIDs[i]], unreadPerFeed[feedID])
		}
	})
}

func setupQueriesForRapid(t *rapid.T) (*store.Queries, *sql.DB) {
	db, err := sql.Open("sqlite", ":memory:")
	assert.Assert(t, err == nil, "failed to open sqlite db: %v", err)

	_, err = db.ExecContext(context.Background(), schema.Schema)
	if err != nil {
		_ = db.Close()
		assert.Assert(t, err == nil, "failed to apply schema: %v", err)
	}

	return store.New(db), db
}
