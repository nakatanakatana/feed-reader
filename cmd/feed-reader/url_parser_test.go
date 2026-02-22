package main

import (
	"testing"

	"github.com/nakatanakatana/feed-reader/store"
	"gotest.tools/v3/assert"
)

func TestURLParser_ExtractUserInfo(t *testing.T) {
	rules := []store.UrlParsingRule{
		{RuleType: "subdomain", Pattern: "example.com"},
		{RuleType: "path", Pattern: "domain.com/users"},
	}
	parser := NewURLParser(rules)

	tests := []struct {
		name     string
		url      string
		expected *store.ExtractedUserInfo
	}{
		{
			name: "Subdomain match",
			url:  "https://user1.example.com/post/123",
			expected: &store.ExtractedUserInfo{
				User:   "user1",
				Domain: "example.com",
			},
		},
		{
			name: "Subdomain no match (no user)",
			url:  "https://example.com/post/123",
			expected: nil,
		},
		{
			name: "Subdomain no match (nested subdomain)",
			url:  "https://sub.user1.example.com/post/123",
			expected: nil,
		},
		{
			name: "Path match",
			url:  "https://domain.com/users/user2/article/456",
			expected: &store.ExtractedUserInfo{
				User:   "user2",
				Domain: "domain.com",
			},
		},
		{
			name: "Path no match (different domain)",
			url:  "https://other.com/users/user2",
			expected: nil,
		},
		{
			name: "Path no match (no user part)",
			url:  "https://domain.com/users/",
			expected: nil,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := parser.ExtractUserInfo(tt.url)
			if tt.expected == nil {
				assert.Assert(t, got == nil)
			} else {
				assert.Assert(t, got != nil)
				assert.Equal(t, got.User, tt.expected.User)
				assert.Equal(t, got.Domain, tt.expected.Domain)
			}
		})
	}
}
