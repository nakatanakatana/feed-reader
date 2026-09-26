package store_test

import (
	"testing"

	"github.com/nakatanakatana/feed-reader/store"
	"gotest.tools/v3/assert"
)

func TestCleanAuthor(t *testing.T) {
	tests := []struct {
		name     string
		input    string
		expected string
	}{
		{
			name:     "plain text author",
			input:    "Alice",
			expected: "Alice",
		},
		{
			name:     "plain text with whitespace",
			input:    "   Bob Smith   ",
			expected: "Bob Smith",
		},
		{
			name:     "single xml tag",
			input:    "<name>Charlie</name>",
			expected: "Charlie",
		},
		{
			name:     "multiple xml tags",
			input:    "<name>David</name><uri>https://example.com</uri>",
			expected: "David https://example.com",
		},
		{
			name:     "nested xml tags",
			input:    "<author><name>Eve</name></author>",
			expected: "Eve",
		},
		{
			name:     "malformed xml fallback",
			input:    "<name>Frank",
			expected: "<name>Frank",
		},
		{
			name:     "empty string",
			input:    "",
			expected: "",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := store.CleanAuthor(tt.input)
			assert.Equal(t, result, tt.expected)
		})
	}
}
