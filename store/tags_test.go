package store_test

import (
	"context"
	"slices"
	"testing"
	"time"

	"github.com/nakatanakatana/feed-reader/store"
	"gotest.tools/v3/assert"
	"gotest.tools/v3/assert/cmp"
)

func TestTags(t *testing.T) {
	q, s := setupDB(t)
	ctx := context.Background()

	// 1. Create Tag
	tag1, err := q.CreateTag(ctx, store.CreateTagParams{
		ID:   "tag-1",
		Name: "Tech",
	})
	assert.NilError(t, err)
	assert.Equal(t, tag1.ID, "tag-1")
	assert.Equal(t, tag1.Name, "Tech")

	_, err = q.CreateTag(ctx, store.CreateTagParams{
		ID:   "tag-2",
		Name: "News",
	})
	assert.NilError(t, err)

	// 2. List Tags
	tags, err := s.ListTags(ctx, store.ListTagsParams{})
	assert.NilError(t, err)
	assert.Assert(t, cmp.Len(tags, 2))
	assert.Equal(t, tags[0].Name, "Tech") // Ordered by UpdatedAt ASC (Default)
	assert.Equal(t, tags[1].Name, "News")

	// 3. Create Feed and Associate Tag
	feedParams := store.CreateFeedParams{
		ID:  "feed-1",
		Url: "http://example.com/feed.xml",
	}
	_, err = q.CreateFeed(ctx, feedParams)
	assert.NilError(t, err)

	err = q.CreateFeedTag(ctx, store.CreateFeedTagParams{
		FeedID: "feed-1",
		TagID:  "tag-1",
	})
	assert.NilError(t, err)

	// 4. List Tags by Feed
	feedTags, err := q.ListTagsByFeedId(ctx, "feed-1")
	assert.NilError(t, err)
	assert.Assert(t, cmp.Len(feedTags, 1))
	assert.Equal(t, feedTags[0].Name, "Tech")

	// 5. Filter Feeds by Tag
	// Feed 1 has Tag 1 (Tech)
	feeds, err := q.ListFeeds(ctx, "tag-1")
	assert.NilError(t, err)
	assert.Assert(t, cmp.Len(feeds, 1))
	assert.Equal(t, feeds[0].ID, "feed-1")

	feeds, err = q.ListFeeds(ctx, "tag-2")
	assert.NilError(t, err)
	assert.Assert(t, cmp.Len(feeds, 0))

	// 6. Filter Items by Tag
	// Create Item linked to Feed 1
	itemParams := store.CreateItemParams{
		ID:  "item-1",
		Url: "http://example.com/item1",
	}
	_, err = q.CreateItem(ctx, itemParams)
	assert.NilError(t, err)

	err = q.CreateFeedItem(ctx, store.CreateFeedItemParams{
		FeedID: "feed-1",
		ItemID: "item-1",
	})
	assert.NilError(t, err)

	// List Items with Tag 1
	items, err := q.ListItems(ctx, store.ListItemsParams{
		TagID:  "tag-1",
		Limit:  10,
		Offset: 0,
	})
	assert.NilError(t, err)
	assert.Assert(t, cmp.Len(items, 1))
	assert.Equal(t, items[0].ID, "item-1")

	// List Items with Tag 2
	items, err = q.ListItems(ctx, store.ListItemsParams{
		TagID:  "tag-2",
		Limit:  10,
		Offset: 0,
	})
	assert.NilError(t, err)
	assert.Assert(t, cmp.Len(items, 0))

	// 7. Delete Feed Tags
	err = q.DeleteFeedTags(ctx, "feed-1")
	assert.NilError(t, err)

	feedTags, err = q.ListTagsByFeedId(ctx, "feed-1")
	assert.NilError(t, err)
	assert.Assert(t, cmp.Len(feedTags, 0))

	// 8. Delete Tag
	err = q.DeleteTag(ctx, "tag-1")
	assert.NilError(t, err)

	tags, err = s.ListTags(ctx, store.ListTagsParams{})
	assert.NilError(t, err)
	assert.Assert(t, cmp.Len(tags, 1))
	assert.Equal(t, tags[0].Name, "News")
}

func TestDeleteFeedTag(t *testing.T) {
	q, _ := setupDB(t)
	ctx := context.Background()

	// Setup: Create Feed and Tag
	_, _ = q.CreateTag(ctx, store.CreateTagParams{ID: "t1", Name: "Tag 1"})
	_, _ = q.CreateFeed(ctx, store.CreateFeedParams{ID: "f1", Url: "u1"})
	_ = q.CreateFeedTag(ctx, store.CreateFeedTagParams{FeedID: "f1", TagID: "t1"})

	// Verify setup
	feedTags, err := q.ListTagsByFeedId(ctx, "f1")
	assert.NilError(t, err)
	assert.Assert(t, cmp.Len(feedTags, 1))

	t.Run("Delete specific tag from feed", func(t *testing.T) {
		err := q.DeleteFeedTag(ctx, store.DeleteFeedTagParams{
			FeedID: "f1",
			TagID:  "t1",
		})
		assert.NilError(t, err)

		feedTags, err := q.ListTagsByFeedId(ctx, "f1")
		assert.NilError(t, err)
		assert.Assert(t, cmp.Len(feedTags, 0))
	})
}

func TestStore_ManageFeedTags(t *testing.T) {
	q, s := setupDB(t)
	ctx := context.Background()

	// Setup: 2 Feeds, 2 Tags
	_, _ = q.CreateTag(ctx, store.CreateTagParams{ID: "t1", Name: "Tag 1"})
	_, _ = q.CreateTag(ctx, store.CreateTagParams{ID: "t2", Name: "Tag 2"})
	_, _ = q.CreateFeed(ctx, store.CreateFeedParams{ID: "f1", Url: "u1"})
	_, _ = q.CreateFeed(ctx, store.CreateFeedParams{ID: "f2", Url: "u2"})

	// Initially: f1 has t1, f2 has t1
	_ = q.CreateFeedTag(ctx, store.CreateFeedTagParams{FeedID: "f1", TagID: "t1"})
	_ = q.CreateFeedTag(ctx, store.CreateFeedTagParams{FeedID: "f2", TagID: "t1"})

	t.Run("Bulk Manage Tags", func(t *testing.T) {
		// Action: Add t2, Remove t1 from both f1 and f2
		err := s.ManageFeedTags(ctx, []string{"f1", "f2"}, []string{"t2"}, []string{"t1"})
		assert.NilError(t, err)

		// Verify f1: should have t2, but not t1
		tags1, err := q.ListTagsByFeedId(ctx, "f1")
		assert.NilError(t, err)
		assert.Assert(t, cmp.Len(tags1, 1))
		assert.Equal(t, tags1[0].ID, "t2")

		// Verify f2: should have t2, but not t1
		tags2, err := q.ListTagsByFeedId(ctx, "f2")
		assert.NilError(t, err)
		assert.Assert(t, cmp.Len(tags2, 1))
		assert.Equal(t, tags2[0].ID, "t2")
	})
}

func TestStore_SetFeedTags(t *testing.T) {
	q, s := setupDB(t)
	ctx := context.Background()

	// Setup: 1 Feed, 3 Tags
	_, _ = q.CreateTag(ctx, store.CreateTagParams{ID: "t1", Name: "Tag 1"})
	_, _ = q.CreateTag(ctx, store.CreateTagParams{ID: "t2", Name: "Tag 2"})
	_, _ = q.CreateTag(ctx, store.CreateTagParams{ID: "t3", Name: "Tag 3"})
	_, _ = q.CreateFeed(ctx, store.CreateFeedParams{ID: "f1", Url: "u1"})

	// Initially: f1 has t1
	_ = q.CreateFeedTag(ctx, store.CreateFeedTagParams{FeedID: "f1", TagID: "t1"})

	t.Run("Set Tags (Replace existing)", func(t *testing.T) {
		// Action: Set f1 tags to t2, t3 (t1 should be removed)
		err := s.SetFeedTags(ctx, "f1", []string{"t2", "t3"})
		assert.NilError(t, err)

		// Verify
		tags, err := q.ListTagsByFeedId(ctx, "f1")
		assert.NilError(t, err)
		assert.Assert(t, cmp.Len(tags, 2))
		ids := []string{tags[0].ID, tags[1].ID}
		assert.Assert(t, isStringInSlice("t2", ids))
		assert.Assert(t, isStringInSlice("t3", ids))
		assert.Assert(t, !isStringInSlice("t1", ids))
	})
}

func isStringInSlice(s string, slice []string) bool {
	return slices.Contains(slice, s)
}

func TestStore_ListTags_Sorting(t *testing.T) {
	q, s := setupDB(t)
	ctx := context.Background()

	// 1. Create Tag 1
	_, err := q.CreateTag(ctx, store.CreateTagParams{
		ID:   "tag-1",
		Name: "Tag 1",
	})
	assert.NilError(t, err)

	time.Sleep(1100 * time.Millisecond)

	// 2. Create Tag 2
	_, err = q.CreateTag(ctx, store.CreateTagParams{
		ID:   "tag-2",
		Name: "Tag 2",
	})
	assert.NilError(t, err)

	// 3. List Tags in created order
	tags, err := s.ListTags(ctx, store.ListTagsParams{})
	assert.NilError(t, err)
	assert.Assert(t, cmp.Len(tags, 2))
	assert.Equal(t, tags[0].Name, "Tag 1")
	assert.Equal(t, tags[1].Name, "Tag 2")
}
