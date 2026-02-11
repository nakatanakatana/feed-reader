package main

import (
	"context"
	"database/sql"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/mmcdole/gofeed"
	schema "github.com/nakatanakatana/feed-reader/sql"
	"github.com/nakatanakatana/feed-reader/store"
	_ "github.com/ncruces/go-sqlite3/driver"
	_ "github.com/ncruces/go-sqlite3/embed"
	"gotest.tools/v3/assert"
)

func TestGofeedFetcher_Fetch(t *testing.T) {
	// Setup store for testing
	db, err := sql.Open("sqlite3", ":memory:")
	assert.NilError(t, err)
	defer func() { _ = db.Close() }()
	_, err = db.Exec(schema.Schema)
	assert.NilError(t, err)
	s := store.NewStore(db)

	tests := []struct {
		name        string
		feedContent string
		contentType string
		wantErr     bool
		check       func(*testing.T, *gofeed.Feed)
	}{
		{
			name: "Valid RSS",
			feedContent: `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0">
<channel>
  <title>W3Schools Home Page</title>
  <link>https://www.w3schools.com</link>
  <description>Free web building tutorials</description>
</channel>
</rss>`,
			contentType: "application/xml",
			wantErr:     false,
			check: func(t *testing.T, f *gofeed.Feed) {
				assert.Assert(t, f != nil, "expected feed, got nil")
				assert.Equal(t, f.Title, "W3Schools Home Page")
			},
		},
		{
			name:        "Invalid XML",
			feedContent: `invalid`,
			contentType: "application/xml",
			wantErr:     true,
			check:       nil,
		},
		{
			name: "HTML Content to Markdown",
			feedContent: `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/">
<channel>
  <title>Markdown Test</title>
  <item>
    <title>HTML Item</title>
    <description>&lt;p&gt;This is &lt;strong&gt;HTML&lt;/strong&gt;&lt;/p&gt;</description>
    <content:encoded>&lt;ul&gt;&lt;li&gt;List Item&lt;/li&gt;&lt;/ul&gt;</content:encoded>
  </item>
</channel>
</rss>`,
			contentType: "application/xml",
			wantErr:     false,
			check: func(t *testing.T, f *gofeed.Feed) {
				assert.Assert(t, f != nil, "expected feed, got nil")
				assert.Equal(t, len(f.Items), 1)
				item := f.Items[0]
				assert.Equal(t, strings.TrimSpace(item.Description), "This is **HTML**")
				assert.Equal(t, strings.TrimSpace(item.Content), "- List Item")
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				w.Header().Set("Content-Type", tt.contentType)
				_, _ = fmt.Fprint(w, tt.feedContent)
			}))
			defer server.Close()

			f := NewGofeedFetcher(s)
			feed, err := f.Fetch(context.Background(), "", server.URL)
			if tt.wantErr {
				assert.Assert(t, err != nil, "expected error")
			} else {
				assert.NilError(t, err)
				if tt.check != nil {
					tt.check(t, feed)
				}
			}
		})
	}
}

func TestGofeedFetcher_ConditionalFetch(t *testing.T) {
	db, err := sql.Open("sqlite3", ":memory:")
	assert.NilError(t, err)
	defer func() { _ = db.Close() }()
	_, err = db.Exec(schema.Schema)
	assert.NilError(t, err)
	s := store.NewStore(db)

	feedID := "test-feed"
	// Create feed to satisfy foreign key
	_, err = s.CreateFeed(context.Background(), store.CreateFeedParams{
		ID:  feedID,
		Url: "http://example.com",
	})
	assert.NilError(t, err)

	f := NewGofeedFetcher(s)

	t.Run("Sends headers and handles 304", func(t *testing.T) {
		etag := "etag1"
		lastMod := "mod1"
		_, err := s.UpsertFeedFetcherCache(context.Background(), store.UpsertFeedFetcherCacheParams{
			FeedID:       feedID,
			Etag:         &etag,
			LastModified: &lastMod,
		})
		assert.NilError(t, err)

		server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			assert.Equal(t, r.Header.Get("If-None-Match"), etag)
			assert.Equal(t, r.Header.Get("If-Modified-Since"), lastMod)
			w.WriteHeader(http.StatusNotModified)
		}))
		defer server.Close()

		_, err = f.Fetch(context.Background(), feedID, server.URL)
		assert.ErrorIs(t, err, ErrNotModified)
	})

	t.Run("Updates cache on 200 OK", func(t *testing.T) {
		newEtag := "etag2"
		newLastMod := "mod2"
		feedContent := `<?xml version="1.0" encoding="UTF-8" ?><rss version="2.0"><channel><title>T</title></channel></rss>`

		server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.Header().Set("ETag", newEtag)
			w.Header().Set("Last-Modified", newLastMod)
			w.Header().Set("Content-Type", "application/xml")
			_, _ = fmt.Fprint(w, feedContent)
		}))
		defer server.Close()

		_, err := f.Fetch(context.Background(), feedID, server.URL)
		assert.NilError(t, err)

		cache, err := s.GetFeedFetcherCache(context.Background(), feedID)
		assert.NilError(t, err)
		assert.Equal(t, *cache.Etag, newEtag)
		assert.Equal(t, *cache.LastModified, newLastMod)
	})

	t.Run("Deletes cache on 5xx", func(t *testing.T) {
		// Pre-create cache
		etag := "to-be-deleted"
		_, err := s.UpsertFeedFetcherCache(context.Background(), store.UpsertFeedFetcherCacheParams{
			FeedID: feedID,
			Etag:   &etag,
		})
		assert.NilError(t, err)

		server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.WriteHeader(http.StatusInternalServerError)
		}))
		defer server.Close()

		_, err = f.Fetch(context.Background(), feedID, server.URL)
		assert.Assert(t, err != nil)

		cache, err := s.GetFeedFetcherCache(context.Background(), feedID)
		assert.Assert(t, err != nil, "expected error, but got cache: %+v", cache)
		assert.ErrorIs(t, err, sql.ErrNoRows)
	})
}
