package main

import (
	"strings"
	"testing"

	"gotest.tools/v3/assert"
)

func TestExportOPML(t *testing.T) {
	feeds := []ExportFeed{
		{
			Title:   "Hacker News",
			XmlURL:  "https://news.ycombinator.com/rss",
			HtmlURL: "https://news.ycombinator.com/",
			Tags:    []string{"Tech", "News"},
		},
		{
			Title:   "Go Blog",
			XmlURL:  "https://go.dev/blog/feed.atom",
			HtmlURL: "https://go.dev/blog/",
			Tags:    []string{"Go", "Programming"},
		},
		{
			Title:   "No Tags Feed",
			XmlURL:  "https://example.com/feed.xml",
			HtmlURL: "https://example.com/",
			Tags:    []string{},
		},
	}

	output, err := ExportOPML(feeds)
	assert.NilError(t, err)

	xmlOutput := string(output)

	// Basic OPML structure
	assert.Check(t, strings.Contains(xmlOutput, `<opml version="2.0">`))
	assert.Check(t, strings.Contains(xmlOutput, "<body>"))

	// Hacker News
	assert.Check(t, strings.Contains(xmlOutput, `title="Hacker News"`))
	assert.Check(t, strings.Contains(xmlOutput, `xmlUrl="https://news.ycombinator.com/rss"`))
	assert.Check(t, strings.Contains(xmlOutput, `category="Tech,News"`))

	// Go Blog
	assert.Check(t, strings.Contains(xmlOutput, `title="Go Blog"`))
	assert.Check(t, strings.Contains(xmlOutput, `xmlUrl="https://go.dev/blog/feed.atom"`))
	assert.Check(t, strings.Contains(xmlOutput, `category="Go,Programming"`))

	// No Tags Feed
	assert.Check(t, strings.Contains(xmlOutput, `title="No Tags Feed"`))
	assert.Check(t, strings.Contains(xmlOutput, `xmlUrl="https://example.com/feed.xml"`))
	assert.Check(t, !strings.Contains(xmlOutput, `category=""`)) // Should probably omit category if empty
}
