package store_test

import (
	"context"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/nakatanakatana/feed-reader/store"
	"gotest.tools/v3/assert"
)

func TestStore_ListItemRead(t *testing.T) {
	s := setupStore(t)
	ctx := context.Background()

	// 1. Setup Data: Create Feed
	feedID := uuid.NewString()
	_, err := s.CreateFeed(ctx, store.CreateFeedParams{
		ID:  feedID,
		Url: "http://example.com/feed.xml",
	})
	assert.NilError(t, err)

	// Create 3 items
	now := time.Now().UTC()
	t1 := now.Add(-3 * time.Hour).Format(time.RFC3339)
	t2 := now.Add(-2 * time.Hour).Format(time.RFC3339)
	t3 := now.Add(-1 * time.Hour).Format(time.RFC3339)

	item1ID := createTestItem(t, s, ctx, feedID, "http://example.com/1", "Item 1", t1)
	item2ID := createTestItem(t, s, ctx, feedID, "http://example.com/2", "Item 2", t2)
	item3ID := createTestItem(t, s, ctx, feedID, "http://example.com/3", "Item 3", t3)

	// Update updated_at manually to control order and filtering
	updateUpdatedAt := func(itemID string, timestamp string) {
		_, err := s.DB.ExecContext(ctx, "UPDATE item_reads SET updated_at = ? WHERE item_id = ?", timestamp, itemID)
		assert.NilError(t, err)
	}

	// Initially all unread
	updateUpdatedAt(item1ID, t1)
	updateUpdatedAt(item2ID, t2)
	updateUpdatedAt(item3ID, t3)

	t.Run("List all item reads", func(t *testing.T) {
		rows, err := s.ListItemRead(ctx, nil)
		assert.NilError(t, err)
		assert.Equal(t, len(rows), 3)
		assert.Equal(t, rows[0].ItemID, item1ID)
		assert.Equal(t, rows[1].ItemID, item2ID)
		assert.Equal(t, rows[2].ItemID, item3ID)
	})

	t.Run("Filter by updated_after", func(t *testing.T) {
		rows, err := s.ListItemRead(ctx, t1)
		assert.NilError(t, err)
		assert.Equal(t, len(rows), 2)
		assert.Equal(t, rows[0].ItemID, item2ID)
		assert.Equal(t, rows[1].ItemID, item3ID)

		rows, err = s.ListItemRead(ctx, t2)
		assert.NilError(t, err)
		assert.Equal(t, len(rows), 1)
		assert.Equal(t, rows[0].ItemID, item3ID)

		rows, err = s.ListItemRead(ctx, t3)
		assert.NilError(t, err)
		assert.Equal(t, len(rows), 0)
	})

	t.Run("Update read status and check updated_at", func(t *testing.T) {
		newNow := time.Now().UTC().Add(1 * time.Hour).Format(time.RFC3339)
		_, err = s.SetItemRead(ctx, store.SetItemReadParams{
			ItemID: item1ID,
			IsRead: 1,
			ReadAt: &newNow,
		})
		assert.NilError(t, err)

		// item1 should now be the newest in terms of updated_at
		rows, err := s.ListItemRead(ctx, t3)
		assert.NilError(t, err)
		assert.Equal(t, len(rows), 1)
		assert.Equal(t, rows[0].ItemID, item1ID)
		assert.Equal(t, rows[0].IsRead, int64(1))
	})
}
