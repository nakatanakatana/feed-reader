package main

import (
	"encoding/json"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gotest.tools/v3/golden"
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

	data, err := json.MarshalIndent(feeds, "", "  ")
	require.NoError(t, err)
	golden.Assert(t, string(data), "parse_opml.golden")
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

	data, err := json.MarshalIndent(feeds, "", "  ")
	require.NoError(t, err)
	golden.Assert(t, string(data), "parse_opml_no_feeds.golden")
}
