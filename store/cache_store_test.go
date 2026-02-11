package store_test

import (
	"context"
	"testing"

	"github.com/google/uuid"
	"github.com/nakatanakatana/feed-reader/store"
	"gotest.tools/v3/assert"
)

func TestFeedFetcherCache(t *testing.T) {
	s := setupStore(t)
	ctx := context.Background()

	// 1. Setup a Feed (Foreign key requirement)
	feedID := uuid.NewString()
	feedParams := store.CreateFeedParams{
		ID:  feedID,
		Url: "http://example.com/feed.xml",
	}
	_, err := s.CreateFeed(ctx, feedParams)
	assert.NilError(t, err)

	etag := "etag-123"
	lastModified := "Wed, 21 Oct 2015 07:28:00 GMT"

	t.Run("Upsert and Get Cache", func(t *testing.T) {
		// Create
		arg := store.UpsertFeedFetcherCacheParams{
			FeedID:       feedID,
			Etag:         &etag,
			LastModified: &lastModified,
		}
		cache, err := s.UpsertFeedFetcherCache(ctx, arg)
		assert.NilError(t, err)
		assert.Equal(t, cache.FeedID, feedID)
		assert.Equal(t, *cache.Etag, etag)
		assert.Equal(t, *cache.LastModified, lastModified)

		// Get
		cache, err = s.GetFeedFetcherCache(ctx, feedID)
		assert.NilError(t, err)
		assert.Equal(t, *cache.Etag, etag)
		assert.Equal(t, *cache.LastModified, lastModified)
	})

	t.Run("Update Cache", func(t *testing.T) {
		newEtag := "etag-456"
		arg := store.UpsertFeedFetcherCacheParams{
			FeedID:       feedID,
			Etag:         &newEtag,
			LastModified: nil,
		}
		_, err := s.UpsertFeedFetcherCache(ctx, arg)
		assert.NilError(t, err)

		cache, err := s.GetFeedFetcherCache(ctx, feedID)
		assert.NilError(t, err)
		assert.Equal(t, *cache.Etag, newEtag)
		assert.Assert(t, cache.LastModified == nil)
	})

	t.Run("Delete Cache", func(t *testing.T) {
		err := s.DeleteFeedFetcherCache(ctx, feedID)
		assert.NilError(t, err)

		_, err = s.GetFeedFetcherCache(ctx, feedID)
		assert.Assert(t, err != nil)
	})
}
