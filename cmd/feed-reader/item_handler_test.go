package main

import (
	"context"
	"testing"
	"time"

	"connectrpc.com/connect"
	"github.com/google/uuid"
	"github.com/nakatanakatana/feed-reader/gen/go/item/v1"
	"github.com/nakatanakatana/feed-reader/store"
	"google.golang.org/protobuf/types/known/timestamppb"
	"gotest.tools/v3/assert"
	"gotest.tools/v3/assert/cmp"
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
	assert.NilError(t, err)

	// Create test items
	now := time.Now().UTC()
	t1 := now.Add(-2 * time.Hour).Format(time.RFC3339)
	t2 := now.Add(-1 * time.Hour).Format(time.RFC3339)
	author := "Test Author"

	err = s.SaveFetchedItem(ctx, store.SaveFetchedItemParams{
		FeedID:      feedID,
		Url:         "http://example.com/item1",
		Title:       new("Item 1"),
		PublishedAt: &t1,
		Author:      &author,
	})
	assert.NilError(t, err)

	var item1ID string
	err = db.QueryRowContext(ctx, "SELECT id FROM items WHERE url = ?", "http://example.com/item1").Scan(&item1ID)
	assert.NilError(t, err)
	_, err = db.ExecContext(ctx, "UPDATE items SET created_at = ? WHERE id = ?", t1, item1ID)
	assert.NilError(t, err)

	err = s.SaveFetchedItem(ctx, store.SaveFetchedItemParams{
		FeedID:      feedID,
		Url:         "http://example.com/item2",
		Title:       new("Item 2"),
		PublishedAt: &t2,
	})
	assert.NilError(t, err)

	var item2ID string
	err = db.QueryRowContext(ctx, "SELECT id FROM items WHERE url = ?", "http://example.com/item2").Scan(&item2ID)
	assert.NilError(t, err)
	_, err = db.ExecContext(ctx, "UPDATE items SET created_at = ? WHERE id = ?", t2, item2ID)
	assert.NilError(t, err)

	t.Run("GetItem", func(t *testing.T) {
		res, err := server.GetItem(ctx, connect.NewRequest(&itemv1.GetItemRequest{Id: item1ID}))
		assert.NilError(t, err)
		assert.Equal(t, res.Msg.Item.Id, item1ID)
		assert.Equal(t, res.Msg.Item.Title, "Item 1")
		assert.Equal(t, res.Msg.Item.Author, author)
		assert.Assert(t, res.Msg.Item.CreatedAt != "")
	})

	t.Run("GetItem_WithRichContent", func(t *testing.T) {
		content := "<h1>Rich</h1>"
		img := "http://img"
		cats := `["news"]`
		tRich := now.Add(1 * time.Hour).Format(time.RFC3339) // Newest
		err = s.SaveFetchedItem(ctx, store.SaveFetchedItemParams{
			FeedID:      feedID,
			Url:         "http://rich",
			Title:       new("Rich Item"),
			Content:     &content,
			ImageUrl:    &img,
			Categories:  &cats,
			PublishedAt: &tRich,
		})
		assert.NilError(t, err)

		var id string
		err = db.QueryRowContext(ctx, "SELECT id FROM items WHERE url = ?", "http://rich").Scan(&id)
		assert.NilError(t, err)
		_, err = db.ExecContext(ctx, "UPDATE items SET created_at = ? WHERE id = ?", tRich, id)
		assert.NilError(t, err)

		res, err := server.GetItem(ctx, connect.NewRequest(&itemv1.GetItemRequest{Id: id}))
		assert.NilError(t, err)
		assert.Equal(t, res.Msg.Item.Content, content)
		assert.Equal(t, res.Msg.Item.ImageUrl, img)
		assert.Equal(t, res.Msg.Item.Categories, cats)
		assert.Assert(t, res.Msg.Item.CreatedAt != "")
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
			Title:       new("Item with desc"),
			Description: &desc,
			PublishedAt: &t2,
		})
		assert.NilError(t, err)

		var itemWithDescID string
		err = db.QueryRowContext(ctx, "SELECT id FROM items WHERE url = ?", "http://example.com/item-with-desc").Scan(&itemWithDescID)
		assert.NilError(t, err)
		_, err = db.ExecContext(ctx, "UPDATE items SET created_at = ? WHERE id = ?", t2, itemWithDescID)
		assert.NilError(t, err)

		res, err := server.ListItems(ctx, connect.NewRequest(&itemv1.ListItemsRequest{
			Limit: 10,
		}))
		assert.NilError(t, err)
		assert.Assert(t, cmp.Len(res.Msg.Items, 4))
		for _, item := range res.Msg.Items {
			assert.Assert(t, item.Title != "")
			assert.Assert(t, item.CreatedAt != "")
		}

		var found bool
		for _, item := range res.Msg.Items {
			if item.Title == "Item with desc" {
				found = true
				assert.Assert(t, cmp.Len(item.Description, 140))
			}
		}
		assert.Assert(t, found)
	})

	t.Run("UpdateItemStatus", func(t *testing.T) {
		_, err := server.UpdateItemStatus(ctx, connect.NewRequest(&itemv1.UpdateItemStatusRequest{
			Ids:    []string{item1ID},
			IsRead: new(true),
		}))
		assert.NilError(t, err)

		got, err := server.GetItem(ctx, connect.NewRequest(&itemv1.GetItemRequest{Id: item1ID}))
		assert.NilError(t, err)
		assert.Assert(t, got.Msg.Item.IsRead)
	})

	t.Run("ListItems_DateFilter", func(t *testing.T) {
		since := now.Add(-90 * time.Minute)
		res, err := server.ListItems(ctx, connect.NewRequest(&itemv1.ListItemsRequest{
			Since: timestamppb.New(since),
			Limit: 10,
		}))
		assert.NilError(t, err)
		// Should include item2 and rich item, but not item1 (2h ago)
		assert.Assert(t, cmp.Len(res.Msg.Items, 3))
	})
}
