package store

import (
	"encoding/xml"
	"io"
	"strings"
)

// CleanAuthor extracts readable text from an author string, stripping XML/HTML tags if present.
func CleanAuthor(author string) string {
	fields := strings.Fields(author)
	if len(fields) == 0 {
		return ""
	}
	normalized := strings.Join(fields, " ")
	if !strings.Contains(normalized, "<") || !strings.Contains(normalized, ">") {
		return normalized
	}

	decoder := xml.NewDecoder(strings.NewReader("<root>" + normalized + "</root>"))
	decoder.Entity = xml.HTMLEntity
	var parts []string
	for {
		token, err := decoder.Token()
		if err != nil {
			if err == io.EOF {
				break
			}
			// Fallback to normalized original string if XML is malformed
			return normalized
		}
		if charData, ok := token.(xml.CharData); ok {
			for _, f := range strings.Fields(string(charData)) {
				parts = append(parts, f)
			}
		}
	}

	if len(parts) == 0 {
		return ""
	}
	return strings.Join(parts, " ")
}
