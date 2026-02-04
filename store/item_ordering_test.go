package store_test

import (
	"context"
	"database/sql"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/nakatanakatana/feed-reader/sql"
	"github.com/nakatanakatana/feed-reader/store"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	_ "modernc.org/sqlite"
	"pgregory.net/rapid"
)

func TestStore_ItemOrdering(t *testing.T) {
	s := setupStore(t)
	ctx := context.Background()

	// Setup Feed
	feedID := uuid.NewString()
	feedTitle := "Ordering Test Feed"
	_, err := s.CreateFeed(ctx, store.CreateFeedParams{
		ID:    feedID,
		Url:   "http://ordering.example.com/feed.xml",
		Title: &feedTitle,
	})
	require.NoError(t, err)

	/*
		Target Order (ASC) - Now based on created_at:
		Item A: Created T1
		Item B: Created T2
		Item C: Created T3
		Item D: Created T4
		Sorted: T1 < T2 < T3 < T4
	*/

	createItemWithDates := func(id, url, title string, pubAt *string, createdAt string) {
		_, err := s.CreateItem(ctx, store.CreateItemParams{
			ID:          id,
			Url:         url,
			Title:       &title,
			PublishedAt: pubAt,
		})
		require.NoError(t, err)

		err = s.CreateFeedItem(ctx, store.CreateFeedItemParams{
			FeedID: feedID,
			ItemID: id,
		})
		require.NoError(t, err)

		// Manually update created_at to control ordering in test
		_, err = s.DB.ExecContext(ctx, "UPDATE items SET created_at = ? WHERE id = ?", createdAt, id)
		require.NoError(t, err)
	}

	// Use simple dates for clarity
	c1 := "2026-01-01T00:00:00Z"
	c2 := "2026-01-02T00:00:00Z"
	c3 := "2026-01-03T00:00:00Z"
	c4 := "2026-01-04T00:00:00Z"

	// Published dates intentionally mixed up or null to prove they are ignored
	p1 := "2026-02-01T00:00:00Z" // Late published
	p2 := "2025-01-01T00:00:00Z" // Early published

	itemA := uuid.NewString()
	itemB := uuid.NewString()
	itemC := uuid.NewString()
	itemD := uuid.NewString()

	createItemWithDates(itemA, "http://ex.com/a", "Item A", &p1, c1)  // Created 1st
	createItemWithDates(itemB, "http://ex.com/b", "Item B", &p2, c2)  // Created 2nd
	createItemWithDates(itemC, "http://ex.com/c", "Item C", nil, c3) // Created 3rd
	createItemWithDates(itemD, "http://ex.com/d", "Item D", nil, c4) // Created 4th

	t.Run("ListItems should sort by created_at ASC", func(t *testing.T) {
		items, err := s.ListItems(ctx, store.ListItemsParams{Limit: 10})
		require.NoError(t, err)
		require.Len(t, items, 4)

		assert.Equal(t, itemA, items[0].ID)
		assert.Equal(t, itemB, items[1].ID)
		assert.Equal(t, itemC, items[2].ID)
		assert.Equal(t, itemD, items[3].ID)
	})

	t.Run("ListItemsByFeed should sort by created_at ASC", func(t *testing.T) {
		items, err := s.ListItems(ctx, store.ListItemsParams{FeedID: feedID, Limit: 10})
		require.NoError(t, err)
		require.Len(t, items, 4)

		assert.Equal(t, itemA, items[0].ID)
		assert.Equal(t, itemB, items[1].ID)
		assert.Equal(t, itemC, items[2].ID)
		assert.Equal(t, itemD, items[3].ID)
	})
}

func TestStore_ItemOrdering_PBT(t *testing.T) {
	rapid.Check(t, func(t *rapid.T) {
		s := setupStoreForRapid(t)
		ctx := context.Background()
		defer func() {
			_ = s.DB.Close()
		}()

		feedID := uuid.NewString()
		_, err := s.CreateFeed(ctx, store.CreateFeedParams{
			ID:  feedID,
			Url: "http://ordering.example.com/pbt.xml",
		})
		require.NoError(t, err)

		count := rapid.IntRange(5, 20).Draw(t, "count")
		base := time.Now().UTC().Truncate(time.Second)
		for i := 0; i < count; i++ {
			id := uuid.NewString()
			url := "http://example.com/pbt/" + uuid.NewString()
			title := "PBT Item"

			createdOffset := rapid.IntRange(-200, 200).Draw(t, "createdOffset")
			createdAt := base.Add(time.Duration(createdOffset) * time.Hour).UTC()

			var publishedAt *string
			if rapid.Bool().Draw(t, "hasPublishedAt") {
				publishedOffset := rapid.IntRange(-200, 200).Draw(t, "publishedOffset")
				published := base.Add(time.Duration(publishedOffset) * time.Hour).UTC()
				publishedStr := published.Format(time.RFC3339)
				publishedAt = &publishedStr
			}

			_, err := s.CreateItem(ctx, store.CreateItemParams{
				ID:          id,
				Url:         url,
				Title:       &title,
				PublishedAt: publishedAt,
			})
			require.NoError(t, err)

			err = s.CreateFeedItem(ctx, store.CreateFeedItemParams{
				FeedID: feedID,
				ItemID: id,
			})
			require.NoError(t, err)

			_, err = s.DB.ExecContext(
				ctx,
				"UPDATE items SET created_at = ? WHERE id = ?",
				createdAt.Format(time.RFC3339),
				id,
			)
			require.NoError(t, err)
		}

		items, err := s.ListItems(ctx, store.ListItemsParams{FeedID: feedID, Limit: 100})
		require.NoError(t, err)
		require.Len(t, items, count)

		var prev time.Time
		for i, item := range items {
			timestamp := item.CreatedAt
			current, err := time.Parse(time.RFC3339, timestamp)
			require.NoError(t, err)
			if i > 0 && current.Before(prev) {
				t.Fatalf("items not ordered by created_at: %s before %s", current, prev)
			}
			prev = current
		}
	})
}

func setupStoreForRapid(t *rapid.T) *store.Store {
	db, err := sql.Open("sqlite", ":memory:")
	if err != nil {
		t.Fatalf("failed to open sqlite db: %v", err)
	}

	_, err = db.ExecContext(context.Background(), schema.Schema)
	if err != nil {
		_ = db.Close()
		t.Fatalf("failed to apply schema: %v", err)
	}

	return store.NewStore(db)
}
