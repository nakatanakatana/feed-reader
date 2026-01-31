package main

import (
	md "github.com/JohannesKaufmann/html-to-markdown/v2"
)

// ConvertHTMLToMarkdown converts an HTML string to Markdown.
func ConvertHTMLToMarkdown(html string) (string, error) {
	if html == "" {
		return "", nil
	}
	return md.ConvertString(html)
}
