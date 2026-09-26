package store

import (
	"encoding/xml"
	"io"
	"strings"
)

// CleanAuthor extracts readable text from an author string, stripping XML/HTML tags if present.
func CleanAuthor(author string) string {
	trimmed := strings.TrimSpace(author)
	if !strings.Contains(trimmed, "<") || !strings.Contains(trimmed, ">") {
		return trimmed
	}

	decoder := xml.NewDecoder(strings.NewReader("<root>" + trimmed + "</root>"))
	var parts []string
	for {
		token, err := decoder.Token()
		if err != nil {
			if err == io.EOF {
				break
			}
			// Fallback to trimmed original string if XML is malformed
			return trimmed
		}
		if charData, ok := token.(xml.CharData); ok {
			text := strings.TrimSpace(string(charData))
			if text != "" {
				parts = append(parts, text)
			}
		}
	}

	if len(parts) == 0 {
		return trimmed
	}
	return strings.Join(parts, " ")
}
