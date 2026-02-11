package main

import (
	"context"
	"testing"

	"connectrpc.com/connect"
	_ "github.com/ncruces/go-sqlite3/driver"
	_ "github.com/ncruces/go-sqlite3/embed"
	"gotest.tools/v3/assert"

	tagv1 "github.com/nakatanakatana/feed-reader/gen/go/tag/v1"
	"github.com/nakatanakatana/feed-reader/store"
)

func TestTagServer(t *testing.T) {
	ctx := context.Background()
	_, db := setupTestDB(t)
	s := store.NewStore(db)
	handler := NewTagServer(s, nil)

	t.Run("Create and List Tags", func(t *testing.T) {
		name := "Test Tag"
		createRes, err := handler.CreateTag(ctx, connect.NewRequest(&tagv1.CreateTagRequest{
			Name: name,
		}))
		assert.NilError(t, err)
		assert.Equal(t, createRes.Msg.Tag.Name, name)

		listRes, err := handler.ListTags(ctx, connect.NewRequest(&tagv1.ListTagsRequest{}))
		assert.NilError(t, err)

		found := false
		for _, tag := range listRes.Msg.Tags {
			if tag.Id == createRes.Msg.Tag.Id {
				found = true
				break
			}
		}
		assert.Assert(t, found, "created tag not found in ListTags")
	})

	t.Run("Delete Tag", func(t *testing.T) {
		createRes, err := handler.CreateTag(ctx, connect.NewRequest(&tagv1.CreateTagRequest{
			Name: "Delete Me",
		}))
		assert.NilError(t, err)

		_, err = handler.DeleteTag(ctx, connect.NewRequest(&tagv1.DeleteTagRequest{
			Id: createRes.Msg.Tag.Id,
		}))
		assert.NilError(t, err)

		listRes, err := handler.ListTags(ctx, connect.NewRequest(&tagv1.ListTagsRequest{}))
		assert.NilError(t, err)

		for _, tag := range listRes.Msg.Tags {
			assert.Assert(t, tag.Id != createRes.Msg.Tag.Id, "deleted tag still found in ListTags")
		}
	})
}

func TestTagServer_ListTags_UnreadCounts(t *testing.T) {
	ctx := context.Background()
	_, db := setupTestDB(t)
	s := store.NewStore(db)
	handler := NewTagServer(s, nil)

	// Setup: 2 Tags
	tag1, err := s.CreateTag(ctx, store.CreateTagParams{ID: "tag-1", Name: "Tech"})
	assert.NilError(t, err)
	_, err = s.CreateTag(ctx, store.CreateTagParams{ID: "tag-2", Name: "News"})
	assert.NilError(t, err)

	// Setup: Feed
	_, err = s.CreateFeed(ctx, store.CreateFeedParams{ID: "feed-1", Url: "url-1"})
	assert.NilError(t, err)
	err = s.CreateFeedTag(ctx, store.CreateFeedTagParams{FeedID: "feed-1", TagID: tag1.ID})
	assert.NilError(t, err)

	// Item 1 - Unread
	_, err = s.CreateItem(ctx, store.CreateItemParams{ID: "item-1", Url: "u-1"})
	assert.NilError(t, err)
	err = s.CreateFeedItem(ctx, store.CreateFeedItemParams{FeedID: "feed-1", ItemID: "item-1"})
	assert.NilError(t, err)

	// Item 2 - Unread
	_, err = s.CreateItem(ctx, store.CreateItemParams{ID: "item-2", Url: "u-2"})
	assert.NilError(t, err)
	err = s.CreateFeedItem(ctx, store.CreateFeedItemParams{FeedID: "feed-1", ItemID: "item-2"})
	assert.NilError(t, err)

	res, err := handler.ListTags(ctx, connect.NewRequest(&tagv1.ListTagsRequest{}))
	assert.NilError(t, err)

	tagMap := make(map[string]int64)
	for _, tag := range res.Msg.Tags {
		tagMap[tag.Id] = tag.UnreadCount
	}

	assert.Equal(t, tagMap["tag-1"], int64(2))
	assert.Equal(t, tagMap["tag-2"], int64(0))
	assert.Equal(t, res.Msg.TotalUnreadCount, int64(2))
}
