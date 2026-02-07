package store_test

import (
	"context"
	"testing"

	"github.com/google/uuid"
	"github.com/nakatanakatana/feed-reader/store"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
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
	require.NoError(t, err)

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
		require.NoError(t, err)
		assert.Equal(t, feedID, cache.FeedID)
		assert.Equal(t, etag, *cache.Etag)
		assert.Equal(t, lastModified, *cache.LastModified)

		// Get
		cache, err = s.GetFeedFetcherCache(ctx, feedID)
		require.NoError(t, err)
		assert.Equal(t, etag, *cache.Etag)
		assert.Equal(t, lastModified, *cache.LastModified)
	})

	t.Run("Update Cache", func(t *testing.T) {
		newEtag := "etag-456"
		arg := store.UpsertFeedFetcherCacheParams{
			FeedID:       feedID,
			Etag:         &newEtag,
			LastModified: nil,
		}
		_, err := s.UpsertFeedFetcherCache(ctx, arg)
		require.NoError(t, err)

		cache, err := s.GetFeedFetcherCache(ctx, feedID)
		require.NoError(t, err)
		assert.Equal(t, newEtag, *cache.Etag)
		assert.Nil(t, cache.LastModified)
	})

	t.Run("Delete Cache", func(t *testing.T) {
		err := s.DeleteFeedFetcherCache(ctx, feedID)
		require.NoError(t, err)

		_, err = s.GetFeedFetcherCache(ctx, feedID)
		assert.Error(t, err)
	})
}
