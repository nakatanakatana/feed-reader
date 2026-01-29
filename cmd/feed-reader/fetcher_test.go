package main

import (
	"context"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/mmcdole/gofeed"
)

func TestGofeedFetcher_Fetch(t *testing.T) {
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

			f := NewGofeedFetcher()
			feed, err := f.Fetch(context.Background(), server.URL)
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