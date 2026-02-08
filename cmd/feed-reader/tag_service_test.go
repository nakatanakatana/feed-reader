package main

import (
	"context"
	"testing"

	"connectrpc.com/connect"
	_ "github.com/ncruces/go-sqlite3/driver"
	_ "github.com/ncruces/go-sqlite3/embed"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

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
		if err != nil {
			t.Fatalf("CreateTag failed: %v", err)
		}

		if createRes.Msg.Tag.Name != name {
			t.Errorf("expected tag name %s, got %s", name, createRes.Msg.Tag.Name)
		}

		listRes, err := handler.ListTags(ctx, connect.NewRequest(&tagv1.ListTagsRequest{}))
		if err != nil {
			t.Fatalf("ListTags failed: %v", err)
		}

		found := false
		for _, tag := range listRes.Msg.Tags {
			if tag.Id == createRes.Msg.Tag.Id {
				found = true
				break
			}
		}
		if !found {
			t.Errorf("created tag not found in ListTags")
		}
	})

	t.Run("Delete Tag", func(t *testing.T) {
		createRes, err := handler.CreateTag(ctx, connect.NewRequest(&tagv1.CreateTagRequest{
			Name: "Delete Me",
		}))
		if err != nil {
			t.Fatalf("CreateTag failed: %v", err)
		}

		_, err = handler.DeleteTag(ctx, connect.NewRequest(&tagv1.DeleteTagRequest{
			Id: createRes.Msg.Tag.Id,
		}))
		if err != nil {
			t.Fatalf("DeleteTag failed: %v", err)
		}

		listRes, err := handler.ListTags(ctx, connect.NewRequest(&tagv1.ListTagsRequest{}))
		if err != nil {
			t.Fatalf("ListTags failed: %v", err)
		}

		for _, tag := range listRes.Msg.Tags {
			if tag.Id == createRes.Msg.Tag.Id {
				t.Errorf("deleted tag still found in ListTags")
			}
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
	require.NoError(t, err)
	_, err = s.CreateTag(ctx, store.CreateTagParams{ID: "tag-2", Name: "News"})
	require.NoError(t, err)

	// Setup: Feed
	_, err = s.CreateFeed(ctx, store.CreateFeedParams{ID: "feed-1", Url: "url-1"})
	require.NoError(t, err)
	err = s.CreateFeedTag(ctx, store.CreateFeedTagParams{FeedID: "feed-1", TagID: tag1.ID})
	require.NoError(t, err)

	// Item 1 - Unread
	_, err = s.CreateItem(ctx, store.CreateItemParams{ID: "item-1", Url: "u-1"})
	require.NoError(t, err)
	err = s.CreateFeedItem(ctx, store.CreateFeedItemParams{FeedID: "feed-1", ItemID: "item-1"})
	require.NoError(t, err)

	// Item 2 - Unread
	_, err = s.CreateItem(ctx, store.CreateItemParams{ID: "item-2", Url: "u-2"})
	require.NoError(t, err)
	err = s.CreateFeedItem(ctx, store.CreateFeedItemParams{FeedID: "feed-1", ItemID: "item-2"})
	require.NoError(t, err)

	res, err := handler.ListTags(ctx, connect.NewRequest(&tagv1.ListTagsRequest{}))
	require.NoError(t, err)

	tagMap := make(map[string]int64)
	for _, tag := range res.Msg.Tags {
		tagMap[tag.Id] = tag.UnreadCount
	}

	assert.Equal(t, int64(2), tagMap["tag-1"])
	assert.Equal(t, int64(0), tagMap["tag-2"])
	assert.Equal(t, int64(2), res.Msg.TotalUnreadCount)
}
