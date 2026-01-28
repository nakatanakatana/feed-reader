package main

import (
	"context"
	"testing"
	"time"

	"connectrpc.com/connect"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"google.golang.org/protobuf/proto"
	_ "modernc.org/sqlite"

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

func TestTagServer_ListTags_Sorting(t *testing.T) {
	ctx := context.Background()
	_, db := setupTestDB(t)
	s := store.NewStore(db)
	handler := NewTagServer(s, nil)

	// Create Tag 1
	res1, err := handler.CreateTag(ctx, connect.NewRequest(&tagv1.CreateTagRequest{Name: "Tag 1"}))
	require.NoError(t, err)

	time.Sleep(1100 * time.Millisecond)

	// Create Tag 2
	res2, err := handler.CreateTag(ctx, connect.NewRequest(&tagv1.CreateTagRequest{Name: "Tag 2"}))
	require.NoError(t, err)

	t.Run("Sort Descending True", func(t *testing.T) {
		req := &tagv1.ListTagsRequest{SortDescending: proto.Bool(true)}
		res, err := handler.ListTags(ctx, connect.NewRequest(req))
		require.NoError(t, err)

		require.Len(t, res.Msg.Tags, 2)
		assert.Equal(t, res2.Msg.Tag.Id, res.Msg.Tags[0].Id)
		assert.Equal(t, res1.Msg.Tag.Id, res.Msg.Tags[1].Id)
	})

	t.Run("Sort Descending False", func(t *testing.T) {
		req := &tagv1.ListTagsRequest{SortDescending: proto.Bool(false)}
		res, err := handler.ListTags(ctx, connect.NewRequest(req))
		require.NoError(t, err)

		require.Len(t, res.Msg.Tags, 2)
		assert.Equal(t, res1.Msg.Tag.Id, res.Msg.Tags[0].Id)
		assert.Equal(t, res2.Msg.Tag.Id, res.Msg.Tags[1].Id)
	})
}
