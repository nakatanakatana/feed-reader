package store_test

import (
	"context"
	"testing"
	"time"

	"github.com/nakatanakatana/feed-reader/store"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestTags(t *testing.T) {
	q, _ := setupDB(t)
	ctx := context.Background()

	// 1. Create Tag
	tag1, err := q.CreateTag(ctx, store.CreateTagParams{
		ID:   "tag-1",
		Name: "Tech",
	})
	require.NoError(t, err)
	assert.Equal(t, "tag-1", tag1.ID)
	assert.Equal(t, "Tech", tag1.Name)

	_, err = q.CreateTag(ctx, store.CreateTagParams{
		ID:   "tag-2",
		Name: "News",
	})
	require.NoError(t, err)

	// 2. List Tags
	tags, err := q.ListTags(ctx)
	require.NoError(t, err)
	assert.Len(t, tags, 2)
	assert.Equal(t, "Tech", tags[0].Name) // Ordered by UpdatedAt ASC (Default)
	assert.Equal(t, "News", tags[1].Name)

	// 3. Create Feed and Associate Tag
	feedParams := store.CreateFeedParams{
		ID:   "feed-1",
		Url:  "http://example.com/feed.xml",
	}
	_, err = q.CreateFeed(ctx, feedParams)
	require.NoError(t, err)

	err = q.CreateFeedTag(ctx, store.CreateFeedTagParams{
		FeedID: "feed-1",
		TagID:  "tag-1",
	})
	require.NoError(t, err)

	// 4. List Tags by Feed
	feedTags, err := q.ListTagsByFeedId(ctx, "feed-1")
	require.NoError(t, err)
	assert.Len(t, feedTags, 1)
	assert.Equal(t, "Tech", feedTags[0].Name)

	// 5. Filter Feeds by Tag
	// Feed 1 has Tag 1 (Tech)
	feeds, err := q.ListFeeds(ctx, "tag-1")
	require.NoError(t, err)
	assert.Len(t, feeds, 1)
	assert.Equal(t, "feed-1", feeds[0].ID)

	feeds, err = q.ListFeeds(ctx, "tag-2")
	require.NoError(t, err)
	assert.Len(t, feeds, 0)

	// 6. Filter Items by Tag
	// Create Item linked to Feed 1
	itemParams := store.CreateItemParams{
		ID:  "item-1",
		Url: "http://example.com/item1",
	}
	_, err = q.CreateItem(ctx, itemParams)
	require.NoError(t, err)

	err = q.CreateFeedItem(ctx, store.CreateFeedItemParams{
		FeedID: "feed-1",
		ItemID: "item-1",
	})
	require.NoError(t, err)

	// List Items with Tag 1
	items, err := q.ListItems(ctx, store.ListItemsParams{
		TagID:  "tag-1",
		Limit:  10,
		Offset: 0,
	})
	require.NoError(t, err)
	assert.Len(t, items, 1)
	assert.Equal(t, "item-1", items[0].ID)

	// List Items with Tag 2
	items, err = q.ListItems(ctx, store.ListItemsParams{
		TagID:  "tag-2",
		Limit:  10,
		Offset: 0,
	})
	require.NoError(t, err)
	assert.Len(t, items, 0)

	// 7. Delete Feed Tags
	err = q.DeleteFeedTags(ctx, "feed-1")
	require.NoError(t, err)

	feedTags, err = q.ListTagsByFeedId(ctx, "feed-1")
	require.NoError(t, err)
	assert.Len(t, feedTags, 0)

	// 8. Delete Tag
	err = q.DeleteTag(ctx, "tag-1")
	require.NoError(t, err)

	tags, err = q.ListTags(ctx)
	require.NoError(t, err)
	assert.Len(t, tags, 1)
	assert.Equal(t, "News", tags[0].Name)
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
	require.NoError(t, err)
	assert.Len(t, feedTags, 1)

	// Attempt to delete specific tag association using the name we want to add to sqlc
	// This SHOULD fail because the statement doesn't exist in the current generated code
	// or we can just try to run it via raw SQL and expect it to work after we add it.
	// For RED phase, I will try to call a method that doesn't exist, but that won't compile.
	// So I will use a test that asserts the behavior we WANT, which is currently NOT supported
	// by any single-tag delete method.

	// Actually, I'll just use a raw SQL exec to try to call the name we intend to use.
	// Since we are using sqlc, we don't have named statements in the DB directly usually,
	// but we can try to EXEC the SQL we intend to add.
	// But that would PASS if the SQL is valid.

	// Better: write a test that uses the (soon to be generated) method.
	// To make it compile but fail to run, I can't really do that easily in Go without it being a compilation error.

	// I'll add the SQL first, then run make gen, then run tests.
	// Protocol says: 1. Select Task, 2. Mark In Progress, 3. Write Failing Tests (Red Phase).

	// I will write a test that expects DeleteFeedTag to exist.
	// I'll comment it out or use a trick to make it compile but fail.

	t.Run("Delete specific tag from feed", func(t *testing.T) {
		err := q.DeleteFeedTag(ctx, store.DeleteFeedTagParams{
			FeedID: "f1",
			TagID:  "t1",
		})
		require.NoError(t, err)

		feedTags, err := q.ListTagsByFeedId(ctx, "f1")
		require.NoError(t, err)
		assert.Len(t, feedTags, 0)
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
		require.NoError(t, err)

		// Verify f1: should have t2, but not t1
		tags1, err := q.ListTagsByFeedId(ctx, "f1")
		require.NoError(t, err)
		assert.Len(t, tags1, 1)
		assert.Equal(t, "t2", tags1[0].ID)

		// Verify f2: should have t2, but not t1
		tags2, err := q.ListTagsByFeedId(ctx, "f2")
		require.NoError(t, err)
		assert.Len(t, tags2, 1)
		assert.Equal(t, "t2", tags2[0].ID)
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
		require.NoError(t, err)

		// Verify
		tags, err := q.ListTagsByFeedId(ctx, "f1")
		require.NoError(t, err)
		assert.Len(t, tags, 2)
		ids := []string{tags[0].ID, tags[1].ID}
		assert.Contains(t, ids, "t2")
		assert.Contains(t, ids, "t3")
		assert.NotContains(t, ids, "t1")
	})
}

func TestStore_ListTags_Sorting(t *testing.T) {
	q, s := setupDB(t)
	ctx := context.Background()

	// 1. Create Tag 1
	_, err := q.CreateTag(ctx, store.CreateTagParams{
		ID:   "tag-1",
		Name: "Tag 1",
	})
	require.NoError(t, err)

	time.Sleep(1100 * time.Millisecond)

	// 2. Create Tag 2
	_, err = q.CreateTag(ctx, store.CreateTagParams{
		ID:   "tag-2",
		Name: "Tag 2",
	})
	require.NoError(t, err)

	// 3. List Tags ASC
	t.Run("List Tags ASC", func(t *testing.T) {
		tags, err := s.ListTags(ctx, store.ListTagsParams{
			SortDescending: false,
		})
		require.NoError(t, err)
		require.Len(t, tags, 2)
		assert.Equal(t, "Tag 1", tags[0].Name)
		assert.Equal(t, "Tag 2", tags[1].Name)
	})

	// 4. List Tags DESC
	t.Run("List Tags DESC", func(t *testing.T) {
		tags, err := s.ListTags(ctx, store.ListTagsParams{
			SortDescending: true,
		})
		require.NoError(t, err)
		require.Len(t, tags, 2)
		assert.Equal(t, "Tag 2", tags[0].Name)
		assert.Equal(t, "Tag 1", tags[1].Name)
	})
}