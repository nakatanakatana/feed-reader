package main

import (
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
	"gotest.tools/v3/golden"
)

func TestConvertHTMLToMarkdown(t *testing.T) {
	tests := []struct {
		name  string
		input string
	}{
		{
			name:  "simple_paragraph",
			input: "<p>Hello World</p>",
		},
		{
			name:  "bold_text",
			input: "<strong>Bold</strong>",
		},
		{
			name:  "link",
			input: "<a href=\"https://example.com\">Link</a>",
		},
		{
			name:  "unordered_list",
			input: "<ul><li>Item 1</li><li>Item 2</li></ul>",
		},
		{
			name:  "empty",
			input: "",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result, err := ConvertHTMLToMarkdown(tt.input)
			assert.NoError(t, err)
			// Trim space to handle potential trailing newlines from the library
			golden.Assert(t, strings.TrimSpace(result), tt.name+".golden")
		})
	}
}
