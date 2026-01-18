package main

import (
	"context"
	"testing"

	"connectrpc.com/connect"
	feedv1 "github.com/nakatanakatana/feed-reader/gen/go/feed/v1"
	"github.com/nakatanakatana/feed-reader/store"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"google.golang.org/protobuf/proto"
)

func TestFeedServer_ListItems(t *testing.T) {
	ctx := context.Background()
	queries := setupTestDB(t)
	server := NewFeedServer(queries, nil, nil)

	// Seed data
	_, err := queries.CreateFeed(ctx, store.CreateFeedParams{Uuid: "f1", Url: "url1"})
	require.NoError(t, err)
	_, err = queries.CreateFeed(ctx, store.CreateFeedParams{Uuid: "f2", Url: "url2"})
	require.NoError(t, err)

	// Items (descending order by PublishedAt)
	itemParams := []store.CreateItemParams{
		{ID: "i1", Url: "u1", Title: proto.String("T1"), PublishedAt: proto.String("2026-01-18T12:00:00Z")},
		{ID: "i2", Url: "u2", Title: proto.String("T2"), PublishedAt: proto.String("2026-01-18T11:00:00Z")},
		{ID: "i3", Url: "u3", Title: proto.String("T3"), PublishedAt: proto.String("2026-01-18T10:00:00Z")},
	}

	for _, p := range itemParams {
		_, err := queries.CreateItem(ctx, p)
		require.NoError(t, err)
	}

	// Link
	require.NoError(t, queries.CreateFeedItem(ctx, store.CreateFeedItemParams{FeedID: "f1", ItemID: "i1"}))
	require.NoError(t, queries.CreateFeedItem(ctx, store.CreateFeedItemParams{FeedID: "f1", ItemID: "i2"}))
	require.NoError(t, queries.CreateFeedItem(ctx, store.CreateFeedItemParams{FeedID: "f2", ItemID: "i3"}))

	t.Run("ListGlobalItems first page", func(t *testing.T) {
		res, err := server.ListGlobalItems(ctx, connect.NewRequest(&feedv1.ListGlobalItemsRequest{
			PageSize: 2,
		}))
		require.NoError(t, err)
		assert.Len(t, res.Msg.Items, 2)
		assert.Equal(t, "i1", res.Msg.Items[0].Id)
		assert.Equal(t, "i2", res.Msg.Items[1].Id)
		assert.NotEmpty(t, res.Msg.NextPageToken)

		// Second page
		res2, err := server.ListGlobalItems(ctx, connect.NewRequest(&feedv1.ListGlobalItemsRequest{
			PageSize:  2,
			PageToken: res.Msg.NextPageToken,
		}))
		require.NoError(t, err)
		assert.Len(t, res2.Msg.Items, 1)
		assert.Equal(t, "i3", res2.Msg.Items[0].Id)
		assert.Empty(t, res2.Msg.NextPageToken)
	})

	t.Run("ListFeedItems", func(t *testing.T) {
		res, err := server.ListFeedItems(ctx, connect.NewRequest(&feedv1.ListFeedItemsRequest{
			FeedId: "f1",
		}))
		require.NoError(t, err)
		assert.Len(t, res.Msg.Items, 2)
		assert.Equal(t, "i1", res.Msg.Items[0].Id)
		assert.Equal(t, "i2", res.Msg.Items[1].Id)
	})

	t.Run("ListGlobalItems with unread filter", func(t *testing.T) {
		// Mark i1 as read
		_, err := queries.MarkItemRead(ctx, "i1")
		require.NoError(t, err)

		res, err := server.ListGlobalItems(ctx, connect.NewRequest(&feedv1.ListGlobalItemsRequest{
			UnreadOnly: true,
		}))
		// Wait, in my handler:
		/*
		if req.Msg.IsRead {
			params.FilterUnread = 1
		} else {
			params.FilterUnread = 0
		}
		*/
		// The proto field is named `is_read`. If I want to filter UNREAD, maybe it should be `unread_only`?
		// But I named it `is_read` in proto.
		// If `is_read` is true, it sounds like "show read items".
		// But my spec said "Provide filtering to show only unread items."
		
		// Let's re-read the spec/proto.
		/*
		message ListGlobalItemsRequest {
		  int32 page_size = 1;
		  string page_token = 2;
		  bool is_read = 3;
		}
		*/
		// If `is_read` is true, I should probably return items where `is_read` is true? 
		// Or if it's a filter, maybe it should be `filter_unread`.

		require.NoError(t, err)
		// With i1 read, and "is_read = true" filtering for UNREAD (as per my handler currently):
		assert.Len(t, res.Msg.Items, 2)
		assert.Equal(t, "i2", res.Msg.Items[0].Id)
		assert.Equal(t, "i3", res.Msg.Items[1].Id)
	})
}
