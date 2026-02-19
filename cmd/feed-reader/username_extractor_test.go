package main

import (
	"testing"

	"github.com/nakatanakatana/feed-reader/store"
	"gotest.tools/v3/assert"
)

func TestUsernameExtractor(t *testing.T) {
	extractor := NewUsernameExtractor()

	t.Run("Extract username from URL with regex", func(t *testing.T) {
		rules := []store.UrlParsingRule{
			{
				Domain:  "example.com",
				Pattern: `^https://example\.com/users/([^/]+)`,
			},
		}

		username, err := extractor.Extract("https://example.com/users/jdoe/posts/1", rules)
		assert.NilError(t, err)
		assert.Equal(t, username, "jdoe")
	})

	t.Run("Return empty for unknown domain", func(t *testing.T) {
		rules := []store.UrlParsingRule{
			{
				Domain:  "example.com",
				Pattern: `^https://example\.com/users/([^/]+)`,
			},
		}

		username, err := extractor.Extract("https://other.com/users/jdoe", rules)
		assert.NilError(t, err)
		assert.Equal(t, username, "")
	})

	t.Run("Return empty if regex does not match", func(t *testing.T) {
		rules := []store.UrlParsingRule{
			{
				Domain:  "example.com",
				Pattern: `^https://example\.com/users/([^/]+)`,
			},
		}

		username, err := extractor.Extract("https://example.com/about", rules)
		assert.NilError(t, err)
		assert.Equal(t, username, "")
	})

	t.Run("Return error on invalid URL", func(t *testing.T) {
		rules := []store.UrlParsingRule{
			{
				Domain:  "example.com",
				Pattern: `^https://example\.com/users/([^/]+)`,
			},
		}

		_, err := extractor.Extract(":", rules)
		assert.ErrorContains(t, err, "parse")
	})

	t.Run("Return error on invalid regex", func(t *testing.T) {
		rules := []store.UrlParsingRule{
			{
				Domain:  "example.com",
				Pattern: `[`,
			},
		}

		_, err := extractor.Extract("https://example.com/users/jdoe", rules)
		assert.ErrorContains(t, err, "error parsing regexp")
	})
}
