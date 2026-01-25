package main

import (
	"context"
	"testing"

	"connectrpc.com/connect"
	_ "github.com/mattn/go-sqlite3"
	tagv1 "github.com/nakatanakatana/feed-reader/gen/go/tag/v1"
	"github.com/nakatanakatana/feed-reader/gen/go/tag/v1/tagv1connect"
	"github.com/nakatanakatana/feed-reader/store"
)

func TestTagServer(t *testing.T) {
	ctx := context.Background()
	_, db := setupTestDB(t)
	s := store.NewStore(db)
	// NewTagServer is not implemented yet, this will fail to compile.
	var handler tagv1connect.TagServiceHandler = NewTagServer(s, nil)

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
