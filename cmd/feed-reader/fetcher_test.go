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
	"github.com/stretchr/testify/require"
)

func TestGofeedFetcher_Fetch(t *testing.T) {
	// Setup store for testing
	db, err := sql.Open("sqlite3", ":memory:")
	require.NoError(t, err)
	defer func() { _ = db.Close() }()
	_, err = db.Exec(schema.Schema)
	require.NoError(t, err)
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
				if f == nil {
					t.Fatal("expected feed, got nil")
				}
				if f.Title != "W3Schools Home Page" {
					t.Errorf("expected title 'W3Schools Home Page', got '%s'", f.Title)
				}
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
				if f == nil {
					t.Fatal("expected feed, got nil")
				}
				if len(f.Items) != 1 {
					t.Fatalf("expected 1 item, got %d", len(f.Items))
				}
				item := f.Items[0]
				expectedDesc := "This is **HTML**"
				if strings.TrimSpace(item.Description) != expectedDesc {
					t.Errorf("expected description '%s', got '%s'", expectedDesc, item.Description)
				}
				expectedContent := "- List Item"
				if strings.TrimSpace(item.Content) != expectedContent {
					t.Errorf("expected content '%s', got '%s'", expectedContent, item.Content)
				}
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
			if (err != nil) != tt.wantErr {
				t.Errorf("Fetch() error = %v, wantErr %v", err, tt.wantErr)
				return
			}
			if !tt.wantErr && tt.check != nil {
				tt.check(t, feed)
			}
		})
	}
}

func TestGofeedFetcher_ConditionalFetch(t *testing.T) {

	db, err := sql.Open("sqlite3", ":memory:")

	require.NoError(t, err)

	defer func() { _ = db.Close() }()

	_, err = db.Exec(schema.Schema)

	require.NoError(t, err)
	s := store.NewStore(db)

	feedID := "test-feed"
	// Create feed to satisfy foreign key
	_, err = s.CreateFeed(context.Background(), store.CreateFeedParams{
		ID:  feedID,
		Url: "http://example.com",
	})
	require.NoError(t, err)

	f := NewGofeedFetcher(s)

	t.Run("Sends headers and handles 304", func(t *testing.T) {
		etag := "etag1"
		lastMod := "mod1"
		_, err := s.UpsertFeedFetcherCache(context.Background(), store.UpsertFeedFetcherCacheParams{
			FeedID:       feedID,
			Etag:         &etag,
			LastModified: &lastMod,
		})
		require.NoError(t, err)

		server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if r.Header.Get("If-None-Match") != etag {
				t.Errorf("expected If-None-Match %s, got %s", etag, r.Header.Get("If-None-Match"))
			}
			if r.Header.Get("If-Modified-Since") != lastMod {
				t.Errorf("expected If-Modified-Since %s, got %s", lastMod, r.Header.Get("If-Modified-Since"))
			}
			w.WriteHeader(http.StatusNotModified)
		}))
		defer server.Close()

		_, err = f.Fetch(context.Background(), feedID, server.URL)
		require.ErrorIs(t, err, ErrNotModified)
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
		require.NoError(t, err)

		cache, err := s.GetFeedFetcherCache(context.Background(), feedID)
		require.NoError(t, err)
		require.Equal(t, newEtag, *cache.Etag)
		require.Equal(t, newLastMod, *cache.LastModified)
	})

	t.Run("Deletes cache on 5xx", func(t *testing.T) {

		// Pre-create cache

		etag := "to-be-deleted"

		_, err := s.UpsertFeedFetcherCache(context.Background(), store.UpsertFeedFetcherCacheParams{

			FeedID: feedID,

			Etag: &etag,
		})

		require.NoError(t, err)

		server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {

			w.WriteHeader(http.StatusInternalServerError)

		}))

		defer server.Close()

		_, err = f.Fetch(context.Background(), feedID, server.URL)

		require.Error(t, err)

		cache, err := s.GetFeedFetcherCache(context.Background(), feedID)

		if err == nil {

			t.Errorf("expected error, but got cache: %+v", cache)

		}

		require.ErrorIs(t, err, sql.ErrNoRows)

	})

}
