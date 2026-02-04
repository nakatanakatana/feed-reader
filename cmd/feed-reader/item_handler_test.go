package main

import (
	"context"
	"testing"
	"time"

	"connectrpc.com/connect"
	"github.com/google/uuid"
	"github.com/nakatanakatana/feed-reader/gen/go/item/v1"
	"github.com/nakatanakatana/feed-reader/store"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"google.golang.org/protobuf/proto"
	"google.golang.org/protobuf/types/known/timestamppb"
)

func TestItemServer(t *testing.T) {
	ctx := context.Background()
	queries, db := setupTestDB(t)
	s := store.NewStore(db)
	server := &ItemServer{store: s}

	// Setup Feed
	feedID := uuid.NewString()
	_, err := queries.CreateFeed(ctx, store.CreateFeedParams{
		ID:  feedID,
		Url: "http://example.com/feed",
	})
	require.NoError(t, err)

	// Create test items
	now := time.Now().UTC()
	t1 := now.Add(-2 * time.Hour).Format(time.RFC3339)
	t2 := now.Add(-1 * time.Hour).Format(time.RFC3339)
	author := "Test Author"

	err = s.SaveFetchedItem(ctx, store.SaveFetchedItemParams{
		FeedID:      feedID,
		Url:         "http://example.com/item1",
		Title:       proto.String("Item 1"),
		PublishedAt: &t1,
		Author:      &author,
	})
	require.NoError(t, err)

	var item1ID string
	err = db.QueryRowContext(ctx, "SELECT id FROM items WHERE url = ?", "http://example.com/item1").Scan(&item1ID)
	require.NoError(t, err)
	_, err = db.ExecContext(ctx, "UPDATE items SET created_at = ? WHERE id = ?", t1, item1ID)
	require.NoError(t, err)

	err = s.SaveFetchedItem(ctx, store.SaveFetchedItemParams{
		FeedID:      feedID,
		Url:         "http://example.com/item2",
		Title:       proto.String("Item 2"),
		PublishedAt: &t2,
	})
	require.NoError(t, err)

	var item2ID string
	err = db.QueryRowContext(ctx, "SELECT id FROM items WHERE url = ?", "http://example.com/item2").Scan(&item2ID)
	require.NoError(t, err)
	_, err = db.ExecContext(ctx, "UPDATE items SET created_at = ? WHERE id = ?", t2, item2ID)
	require.NoError(t, err)

	t.Run("GetItem", func(t *testing.T) {
		res, err := server.GetItem(ctx, connect.NewRequest(&itemv1.GetItemRequest{Id: item1ID}))
		require.NoError(t, err)
		assert.Equal(t, item1ID, res.Msg.Item.Id)
		assert.Equal(t, "Item 1", res.Msg.Item.Title)
		assert.Equal(t, author, res.Msg.Item.Author)
		assert.NotEmpty(t, res.Msg.Item.CreatedAt)
	})

	t.Run("GetItem_WithRichContent", func(t *testing.T) {
		content := "<h1>Rich</h1>"
		img := "http://img"
		cats := `["news"]`
		tRich := now.Add(1 * time.Hour).Format(time.RFC3339) // Newest
		err = s.SaveFetchedItem(ctx, store.SaveFetchedItemParams{
			FeedID:      feedID,
			Url:         "http://rich",
			Title:       proto.String("Rich Item"),
			Content:     &content,
			ImageUrl:    &img,
			Categories:  &cats,
			PublishedAt: &tRich,
		})
		require.NoError(t, err)

		var id string
		err = db.QueryRowContext(ctx, "SELECT id FROM items WHERE url = ?", "http://rich").Scan(&id)
		require.NoError(t, err)
		_, err = db.ExecContext(ctx, "UPDATE items SET created_at = ? WHERE id = ?", tRich, id)
		require.NoError(t, err)

		res, err := server.GetItem(ctx, connect.NewRequest(&itemv1.GetItemRequest{Id: id}))
		require.NoError(t, err)
		assert.Equal(t, content, res.Msg.Item.Content)
		assert.Equal(t, img, res.Msg.Item.ImageUrl)
		assert.Equal(t, cats, res.Msg.Item.Categories)
		assert.NotEmpty(t, res.Msg.Item.CreatedAt)
	})

	t.Run("ListItems", func(t *testing.T) {
		longDesc := make([]byte, 150)
		for i := range longDesc {
			longDesc[i] = 'a'
		}
		desc := string(longDesc)
		err = s.SaveFetchedItem(ctx, store.SaveFetchedItemParams{
			FeedID:      feedID,
			Url:         "http://example.com/item-with-desc",
			Title:       proto.String("Item with desc"),
			Description: &desc,
			PublishedAt: &t2,
		})
		require.NoError(t, err)

		var itemWithDescID string
		err = db.QueryRowContext(ctx, "SELECT id FROM items WHERE url = ?", "http://example.com/item-with-desc").Scan(&itemWithDescID)
		require.NoError(t, err)
		_, err = db.ExecContext(ctx, "UPDATE items SET created_at = ? WHERE id = ?", t2, itemWithDescID)
		require.NoError(t, err)

		res, err := server.ListItems(ctx, connect.NewRequest(&itemv1.ListItemsRequest{
			Limit: 10,
		}))
		require.NoError(t, err)
		assert.Len(t, res.Msg.Items, 4)
		for _, item := range res.Msg.Items {
			assert.NotEmpty(t, item.Title)
			assert.NotEmpty(t, item.CreatedAt)
		}

		var found bool
		for _, item := range res.Msg.Items {
			if item.Title == "Item with desc" {
				found = true
				assert.Len(t, item.Description, 140)
			}
		}
		assert.True(t, found)
	})

	t.Run("UpdateItemStatus", func(t *testing.T) {
		_, err := server.UpdateItemStatus(ctx, connect.NewRequest(&itemv1.UpdateItemStatusRequest{
			Ids:    []string{item1ID},
			IsRead: proto.Bool(true),
		}))
		require.NoError(t, err)

		got, err := server.GetItem(ctx, connect.NewRequest(&itemv1.GetItemRequest{Id: item1ID}))
		require.NoError(t, err)
		assert.True(t, got.Msg.Item.IsRead)
	})

	t.Run("ListItems_DateFilter", func(t *testing.T) {
		since := now.Add(-90 * time.Minute)
		res, err := server.ListItems(ctx, connect.NewRequest(&itemv1.ListItemsRequest{
			Since: timestamppb.New(since),
			Limit:          10,
		}))
		require.NoError(t, err)
		// Should include item2 and rich item, but not item1 (2h ago)
		assert.Len(t, res.Msg.Items, 3)
	})
}
