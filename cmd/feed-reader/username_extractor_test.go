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

	t.Run("Extract username from subdomain", func(t *testing.T) {
		rules := []store.UrlParsingRule{
			{
				Domain:  "sub.example.com",
				Pattern: `^https://sub\.example\.com/([^/]+)`,
			},
		}

		username, err := extractor.Extract("https://sub.example.com/jdoe", rules)
		assert.NilError(t, err)
		assert.Equal(t, username, "jdoe")
	})

	t.Run("Extract username with port in URL", func(t *testing.T) {
		rules := []store.UrlParsingRule{
			{
				Domain:  "localhost:8080",
				Pattern: `^http://localhost:8080/users/([^/]+)`,
			},
		}

		username, err := extractor.Extract("http://localhost:8080/users/jdoe", rules)
		assert.NilError(t, err)
		assert.Equal(t, username, "jdoe")
	})

	t.Run("Extract from first capture group only", func(t *testing.T) {
		rules := []store.UrlParsingRule{
			{
				Domain:  "example.com",
				Pattern: `^https://example\.com/users/([^/]+)/posts/([^/]+)`,
			},
		}

		username, err := extractor.Extract("https://example.com/users/jdoe/posts/123", rules)
		assert.NilError(t, err)
		assert.Equal(t, username, "jdoe")
	})

	t.Run("Case insensitive matching if regex specifies it", func(t *testing.T) {
		rules := []store.UrlParsingRule{
			{
				Domain:  "example.com",
				Pattern: `(?i)^https://example\.com/USERS/([^/]+)`,
			},
		}

		username, err := extractor.Extract("https://example.com/users/jdoe", rules)
		assert.NilError(t, err)
		assert.Equal(t, username, "jdoe")
	})
}
