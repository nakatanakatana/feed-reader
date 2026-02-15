package main

import (
	"testing"

	"gotest.tools/v3/assert"
)

func TestParseOPML_WithTags(t *testing.T) {
	opmlContent := `<?xml version="1.0" encoding="UTF-8"?>
<opml version="2.0">
  <head>
    <title>Feeds with Tags</title>
  </head>
  <body>
    <outline text="Tech News" title="Tech News">
      <outline text="Hacker News" title="Hacker News" type="rss" xmlUrl="https://news.ycombinator.com/rss" category="News,Social"/>
      <outline text="Go Blog" title="Go Blog" type="rss" xmlUrl="https://go.dev/blog/feed.atom" category="Programming"/>
    </outline>
    <outline text="Uncategorized Feed" title="Uncategorized Feed" type="rss" xmlUrl="https://example.com/feed" category="General"/>
  </body>
</opml>`

	feeds, err := ParseOPML([]byte(opmlContent))
	assert.NilError(t, err)

	assert.Equal(t, len(feeds), 3)

	// Hacker News: Tags from folder "Tech News" and category "News,Social"
	assert.Equal(t, feeds[0].Title, "Hacker News")
	assert.Equal(t, feeds[0].URL, "https://news.ycombinator.com/rss")
	assert.DeepEqual(t, feeds[0].Tags, []string{"News", "Social", "Tech News"})

	// Go Blog: Tags from folder "Tech News" and category "Programming"
	assert.Equal(t, feeds[1].Title, "Go Blog")
	assert.Equal(t, feeds[1].URL, "https://go.dev/blog/feed.atom")
	assert.DeepEqual(t, feeds[1].Tags, []string{"Programming", "Tech News"})

	// Uncategorized Feed: Category "General"
	assert.Equal(t, feeds[2].Title, "Uncategorized Feed")
	assert.Equal(t, feeds[2].URL, "https://example.com/feed")
	assert.DeepEqual(t, feeds[2].Tags, []string{"General"})
}
