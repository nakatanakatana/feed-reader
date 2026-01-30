package main

import (
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestConvertHTMLToMarkdown(t *testing.T) {
	tests := []struct {
		name     string
		input    string
		expected string
	}{
		{
			name:     "Simple Paragraph",
			input:    "<p>Hello World</p>",
			expected: "Hello World",
		},
		{
			name:     "Bold Text",
			input:    "<strong>Bold</strong>",
			expected: "**Bold**",
		},
		{
			name:     "Link",
			input:    "<a href=\"https://example.com\">Link</a>",
			expected: "[Link](https://example.com)",
		},
		{
			name:     "Unordered List",
			input:    "<ul><li>Item 1</li><li>Item 2</li></ul>",
			expected: "- Item 1\n- Item 2",
		},
		{
			name:     "Empty",
			input:    "",
			expected: "",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result, err := ConvertHTMLToMarkdown(tt.input)
			assert.NoError(t, err)
			// Trim space to handle potential trailing newlines from the library
			assert.Equal(t, tt.expected, strings.TrimSpace(result))
		})
	}
}
