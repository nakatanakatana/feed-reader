package main

import (
	"context"
	"testing"

	"github.com/mmcdole/gofeed"
	"gotest.tools/v3/assert"
)

func TestFetcherService_normalizeItem_Author(t *testing.T) {
	s := &FetcherService{
		usernameExtractor: NewUsernameExtractor(),
		blockingService:   NewBlockingService(),
	}
	ctx := context.Background()
	feedID := "test-feed-id"

	t.Run("use item.Author.Name", func(t *testing.T) {
		item := &gofeed.Item{
			Author: &gofeed.Person{
				Name:  "John Doe",
				Email: "john@example.com",
			},
		}
		params := s.normalizeItem(ctx, feedID, item, nil, nil)
		assert.Assert(t, params.Author != nil)
		assert.Equal(t, *params.Author, "John Doe")
	})

	t.Run("use item.Authors[0].Name if item.Author is nil", func(t *testing.T) {
		item := &gofeed.Item{
			Authors: []*gofeed.Person{
				{Name: "Jane Smith"},
				{Name: "Second Author"},
			},
		}
		params := s.normalizeItem(ctx, feedID, item, nil, nil)
		assert.Assert(t, params.Author != nil)
		assert.Equal(t, *params.Author, "Jane Smith")
	})

	t.Run("use item.Authors[0].Name if item.Author.Name is empty", func(t *testing.T) {
		item := &gofeed.Item{
			Author: &gofeed.Person{
				Name: "",
			},
			Authors: []*gofeed.Person{
				{Name: "Jane Smith"},
			},
		}
		params := s.normalizeItem(ctx, feedID, item, nil, nil)
		assert.Assert(t, params.Author != nil)
		assert.Equal(t, *params.Author, "Jane Smith")
	})

	t.Run("no author name results in nil", func(t *testing.T) {
		item := &gofeed.Item{
			Author: &gofeed.Person{
				Email: "john@example.com",
			},
		}
		params := s.normalizeItem(ctx, feedID, item, nil, nil)
		assert.Assert(t, params.Author == nil)
	})

	t.Run("empty item.Authors results in nil", func(t *testing.T) {
		item := &gofeed.Item{
			Authors: []*gofeed.Person{},
		}
		params := s.normalizeItem(ctx, feedID, item, nil, nil)
		assert.Assert(t, params.Author == nil)
	})

	t.Run("item.Authors[0] with empty name results in nil", func(t *testing.T) {
		item := &gofeed.Item{
			Authors: []*gofeed.Person{
				{Email: "jane@example.com"},
			},
		}
		params := s.normalizeItem(ctx, feedID, item, nil, nil)
		assert.Assert(t, params.Author == nil)
	})
}
