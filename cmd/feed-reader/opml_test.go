package main

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestParseOPML(t *testing.T) {
	opmlContent := `<?xml version="1.0" encoding="UTF-8"?>
<opml version="1.0">
    <head>
        <title>My Feeds</title>
    </head>
    <body>
        <outline text="Tech" title="Tech">
            <outline type="rss" text="Hacker News" title="Hacker News" xmlUrl="https://news.ycombinator.com/rss" htmlUrl="https://news.ycombinator.com/"/>
            <outline type="rss" text="Go Blog" title="Go Blog" xmlUrl="https://go.dev/blog/feed.atom"/>
        </outline>
        <outline type="rss" text="Another Feed" title="Another Feed" xmlUrl="https://example.com/feed.xml"/>
    </body>
</opml>`

	feeds, err := ParseOPML([]byte(opmlContent))
	require.NoError(t, err)
	assert.Len(t, feeds, 3)

	assert.Equal(t, "Hacker News", feeds[0].Title)
	assert.Equal(t, "https://news.ycombinator.com/rss", feeds[0].URL)

	assert.Equal(t, "Go Blog", feeds[1].Title)
	assert.Equal(t, "https://go.dev/blog/feed.atom", feeds[1].URL)
	
	assert.Equal(t, "Another Feed", feeds[2].Title)
	assert.Equal(t, "https://example.com/feed.xml", feeds[2].URL)
}

func TestParseOPML_InvalidXML(t *testing.T) {
	_, err := ParseOPML([]byte("invalid xml"))
	assert.Error(t, err)
}

func TestParseOPML_NoFeeds(t *testing.T) {
	opmlContent := `<?xml version="1.0" encoding="UTF-8"?>
<opml version="1.0">
    <head>
        <title>Empty</title>
    </head>
    <body>
        <outline text="Folder" />
    </body>
</opml>`
	feeds, err := ParseOPML([]byte(opmlContent))
	require.NoError(t, err)
	assert.Empty(t, feeds)
}

