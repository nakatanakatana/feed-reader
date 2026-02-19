package main

import (
	"testing"

	"github.com/nakatanakatana/feed-reader/store"
	"gotest.tools/v3/assert"
)

func TestBlockingService(t *testing.T) {
	service := NewBlockingService()

	t.Run("Block by domain", func(t *testing.T) {
		rules := []store.BlockingRule{
			{
				RuleType: "user_domain",
				Domain:   ptr("blocked.com"),
			},
		}

		item := store.SaveFetchedItemParams{
			Url: "https://blocked.com/post/1",
		}

		blocked, reason := service.ShouldBlock(item, rules)
		assert.Assert(t, blocked)
		assert.Equal(t, reason, "domain: blocked.com")
	})

	t.Run("Block by username and domain", func(t *testing.T) {
		rules := []store.BlockingRule{
			{
				RuleType: "user_domain",
				Username: ptr("spammer"),
				Domain:   ptr("example.com"),
			},
		}

		// Same username, different domain -> Not blocked
		item1 := store.SaveFetchedItemParams{
			Url:      "https://other.com/spammer",
			Username: ptr("spammer"),
		}
		blocked1, _ := service.ShouldBlock(item1, rules)
		assert.Assert(t, !blocked1)

		// Same domain, different username -> Not blocked
		item2 := store.SaveFetchedItemParams{
			Url:      "https://example.com/legit",
			Username: ptr("legit"),
		}
		blocked2, _ := service.ShouldBlock(item2, rules)
		assert.Assert(t, !blocked2)

		// Both match -> Blocked
		item3 := store.SaveFetchedItemParams{
			Url:      "https://example.com/users/spammer",
			Username: ptr("spammer"),
		}
		blocked3, reason := service.ShouldBlock(item3, rules)
		assert.Assert(t, blocked3)
		assert.Equal(t, reason, "user: spammer @ example.com")
	})

	t.Run("Block by username alone", func(t *testing.T) {
		rules := []store.BlockingRule{
			{
				RuleType: "user_domain",
				Username: ptr("global_spammer"),
			},
		}

		item := store.SaveFetchedItemParams{
			Url:      "https://any-domain.com/post",
			Username: ptr("global_spammer"),
		}

		blocked, reason := service.ShouldBlock(item, rules)
		assert.Assert(t, blocked)
		assert.Equal(t, reason, "username: global_spammer")
	})

	t.Run("Block by keyword in title", func(t *testing.T) {
		rules := []store.BlockingRule{
			{
				RuleType: "keyword",
				Keyword:  ptr("spammy"),
			},
		}

		item := store.SaveFetchedItemParams{
			Title: ptr("This is a spammy post"),
		}

		blocked, reason := service.ShouldBlock(item, rules)
		assert.Assert(t, blocked)
		assert.Equal(t, reason, "keyword in title: spammy")
	})

	t.Run("Block by keyword in content", func(t *testing.T) {
		rules := []store.BlockingRule{
			{
				RuleType: "keyword",
				Keyword:  ptr("offensive"),
			},
		}

		item := store.SaveFetchedItemParams{
			Title:   ptr("Normal title"),
			Content: ptr("This content contains offensive words."),
		}

		blocked, reason := service.ShouldBlock(item, rules)
		assert.Assert(t, blocked)
		assert.Equal(t, reason, "keyword in content: offensive")
	})

	t.Run("No rules match", func(t *testing.T) {
		rules := []store.BlockingRule{
			{
				RuleType: "user_domain",
				Domain:   ptr("blocked.com"),
			},
			{
				RuleType: "keyword",
				Keyword:  ptr("spammy"),
			},
		}

		item := store.SaveFetchedItemParams{
			Url:     "https://legit.com/post",
			Title:   ptr("Great post"),
			Content: ptr("Interesting content"),
		}

		blocked, _ := service.ShouldBlock(item, rules)
		assert.Assert(t, !blocked)
	})
}

func ptr(s string) *string {
	return &s
}
