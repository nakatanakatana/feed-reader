package main

import (
	"context"
	"fmt"
	"log/slog"
	"sync/atomic"
	"testing"
	"time"

	"github.com/mmcdole/gofeed"
	"github.com/nakatanakatana/feed-reader/store"
	"gotest.tools/v3/assert"
)

type concurrentMockFetcher struct {
	delay     time.Duration
	callCount int32
}

func (m *concurrentMockFetcher) Fetch(ctx context.Context, feedID string, url string) (*gofeed.Feed, error) {
	atomic.AddInt32(&m.callCount, 1)
	if m.delay > 0 {
		time.Sleep(m.delay)
	}
	return &gofeed.Feed{Title: "Title " + url}, nil
}

func TestOPMLImporter_ImportSync_Parallel(t *testing.T) {
	ctx := context.Background()
	count := 10
	opmlContent := `<?xml version="1.0" encoding="UTF-8"?>
<opml version="1.0">
    <body>`
	for i := 0; i < count; i++ {
		opmlContent += fmt.Sprintf("\n        <outline text=\"Feed %d\" xmlUrl=\"https://example.com/feed/%d\" />", i, i)
	}
	opmlContent += `
    </body>
</opml>`

	_, db := setupTestDB(t)
	s := store.NewStore(db)

	// Use a fetcher with delay to make serial vs parallel difference visible
	fetcher := &concurrentMockFetcher{delay: 10 * time.Millisecond}
	importer := NewOPMLImporter(s, fetcher, slog.Default(), nil)

	start := time.Now()
	results, err := importer.ImportSync(ctx, []byte(opmlContent))
	duration := time.Since(start)

	assert.NilError(t, err)
	assert.Equal(t, results.Total, int32(count))
	assert.Equal(t, results.Success, int32(count))
	assert.Equal(t, atomic.LoadInt32(&fetcher.callCount), int32(count))

	// If serial, it should take at least count * delay (100ms)
	t.Logf("Import duration: %v", duration)
}
