package main

import (
	"context"
	"log/slog"
	"os"
	"testing"

	"github.com/nakatanakatana/feed-reader/store"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestMigrateHTMLToMarkdown(t *testing.T) {
	queries, db := setupTestDB(t)
	s := store.NewStore(db)
	ctx := context.Background()
	logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))

	// Setup data
	feedID := "feed1"
	_, err := queries.CreateFeed(ctx, store.CreateFeedParams{ID: feedID, Url: "http://example.com/feed"})
	require.NoError(t, err)

	item1ID := "item1"
	item1HTML := "<p>Hello <strong>World</strong></p>"
	_, err = queries.CreateItem(ctx, store.CreateItemParams{
		ID:          item1ID,
		Url:         "http://example.com/1",
		Description: &item1HTML,
	})
	require.NoError(t, err)
	err = queries.CreateFeedItem(ctx, store.CreateFeedItemParams{FeedID: feedID, ItemID: item1ID})
	require.NoError(t, err)

	item2ID := "item2"
	item2HTML := "<ul><li>Item A</li></ul>"
	_, err = queries.CreateItem(ctx, store.CreateItemParams{
		ID:      item2ID,
		Url:     "http://example.com/2",
		Content: &item2HTML,
	})
	require.NoError(t, err)
	err = queries.CreateFeedItem(ctx, store.CreateFeedItemParams{FeedID: feedID, ItemID: item2ID})
	require.NoError(t, err)

	// Run migration
	err = migrateHTMLToMarkdown(ctx, s, logger)
	require.NoError(t, err)

	// Verify Item 1
	got1, err := queries.GetItem(ctx, item1ID)
	require.NoError(t, err)
	assert.Equal(t, "Hello **World**", *got1.Description)

	// Verify Item 2
	got2, err := queries.GetItem(ctx, item2ID)
	require.NoError(t, err)
	assert.Equal(t, "- Item A", *got2.Content)
}
