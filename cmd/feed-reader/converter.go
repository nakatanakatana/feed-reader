package main

import (
	md "github.com/JohannesKaufmann/html-to-markdown"
)

// ConvertHTMLToMarkdown converts an HTML string to Markdown.
func ConvertHTMLToMarkdown(html string) (string, error) {
	if html == "" {
		return "", nil
	}
	converter := md.NewConverter("", true, nil)
	return converter.ConvertString(html)
}
