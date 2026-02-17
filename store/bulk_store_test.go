package store_test

import (
	"context"
	"testing"

	"github.com/google/uuid"
	"github.com/nakatanakatana/feed-reader/store"
	"gotest.tools/v3/assert"
	"gotest.tools/v3/assert/cmp"
)

func TestStore_BulkCreateFeeds(t *testing.T) {
	s := setupStore(t)
	ctx := context.Background()

	feeds := []store.CreateFeedParams{
		{
			ID:    uuid.NewString(),
			Url:   "http://example.com/feed1.xml",
			Title: func() *string { s := "Feed 1"; return &s }(),
		},
		{
			ID:    uuid.NewString(),
			Url:   "http://example.com/feed2.xml",
			Title: func() *string { s := "Feed 2"; return &s }(),
		},
	}

	err := s.BulkCreateFeeds(ctx, feeds)
	assert.NilError(t, err)

	// Verify
	dbFeeds, err := s.ListFeeds(ctx, store.ListFeedsParams{})
	assert.NilError(t, err)
	assert.Assert(t, cmp.Len(dbFeeds, 2))
}

func TestStore_BulkCreateTags(t *testing.T) {
	s := setupStore(t)
	ctx := context.Background()

	tags := []store.CreateTagParams{
		{
			ID:   uuid.NewString(),
			Name: "Tag 1",
		},
		{
			ID:   uuid.NewString(),
			Name: "Tag 2",
		},
	}

	err := s.BulkCreateTags(ctx, tags)
	assert.NilError(t, err)

	// Verify
	dbTags, err := s.ListTags(ctx, store.ListTagsParams{})
	assert.NilError(t, err)
	assert.Assert(t, cmp.Len(dbTags, 2))
}

func TestStore_BulkCreateFeedTags(t *testing.T) {
	s := setupStore(t)
	ctx := context.Background()

	// Setup feeds and tags
	feedID := uuid.NewString()
	_, err := s.CreateFeed(ctx, store.CreateFeedParams{ID: feedID, Url: "http://example.com"})
	assert.NilError(t, err)

	tag1ID := uuid.NewString()
	_, err = s.CreateTag(ctx, store.CreateTagParams{ID: tag1ID, Name: "Tag 1"})
	assert.NilError(t, err)

	tag2ID := uuid.NewString()
	_, err = s.CreateTag(ctx, store.CreateTagParams{ID: tag2ID, Name: "Tag 2"})
	assert.NilError(t, err)

	feedTags := []store.CreateFeedTagParams{
		{
			FeedID: feedID,
			TagID:  tag1ID,
		},
		{
			FeedID: feedID,
			TagID:  tag2ID,
		},
	}

	err = s.BulkCreateFeedTags(ctx, feedTags)
	assert.NilError(t, err)

	// Verify
	dbTags, err := s.ListTagsByFeedId(ctx, feedID)
	assert.NilError(t, err)
	assert.Assert(t, cmp.Len(dbTags, 2))
}
