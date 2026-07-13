package main

import (
	"context"
	"log/slog"
	"strings"
	"testing"
	"time"

	schema "github.com/nakatanakatana/feed-reader/sql"
	"github.com/nakatanakatana/feed-reader/store"
	_ "modernc.org/sqlite"
)

type MockJob struct {
	executed bool
}

func (j *MockJob) Execute(ctx context.Context, q *store.Queries) error {
	j.executed = true
	return nil
}

func setupTestStore(t *testing.T) *store.Store {
	db, err := store.OpenDB(":memory:")
	if err != nil {
		t.Fatalf("failed to open database: %v", err)
	}

	_, err = db.Exec(schema.Schema)
	if err != nil {
		t.Fatalf("failed to create schema: %v", err)
	}

	t.Cleanup(func() {
		_ = db.Close()
	})

	return store.NewStore(db)
}

func TestWriteQueueJobInterface(t *testing.T) {
	var _ WriteQueueJob = (*SaveItemsJob)(nil)
	var _ WriteQueueJob = (*UpdateFeedJob)(nil)
}

func TestNewWriteQueueService(t *testing.T) {
	cfg := WriteQueueConfig{
		MaxBatchSize:  10,
		FlushInterval: 100 * time.Millisecond,
	}
	s := NewWriteQueueService(nil, cfg, slog.Default())
	if s == nil {
		t.Fatal("expected NewWriteQueueService to return a service")
	}
}

func TestWriteQueueServiceLoopCountTrigger(t *testing.T) {
	cfg := WriteQueueConfig{
		MaxBatchSize:  2,
		FlushInterval: 1 * time.Hour, // Set long interval to avoid timer trigger
	}
	st := setupTestStore(t)
	s := NewWriteQueueService(st, cfg, slog.Default())
	ctx := t.Context()

	go s.Start(ctx)

	job1 := &MockJob{}
	job2 := &MockJob{}

	s.Submit(job1)
	s.Submit(job2)

	// Wait for processing
	time.Sleep(50 * time.Millisecond)

	if !job1.executed || !job2.executed {
		t.Error("expected jobs to be executed when MaxBatchSize is reached")
	}
}

func TestWriteQueueServiceIntegration(t *testing.T) {
	cfg := WriteQueueConfig{
		MaxBatchSize:  5,
		FlushInterval: 100 * time.Millisecond,
	}
	st := setupTestStore(t)
	ctx := t.Context()

	s := NewWriteQueueService(st, cfg, slog.Default())
	go s.Start(ctx)

	// Setup feed
	feed, _ := st.CreateFeed(ctx, store.CreateFeedParams{ID: "f1", Url: "url1"})

	// Submit jobs
	job := &SaveItemsJob{
		Items: []store.SaveFetchedItemParams{
			{FeedID: feed.ID, Url: "item1", Title: new("T1")},
			{FeedID: feed.ID, Url: "item2", Title: new("T2")},
		},
	}
	s.Submit(job)

	// Wait for processing
	time.Sleep(150 * time.Millisecond)

	// Verify
	items, _ := st.ListItems(ctx, store.StoreListItemsParams{
		FeedID:    feed.ID,
		Limit:     10,
		IsBlocked: false,
	})
	if len(items) != 2 {
		t.Errorf("expected 2 items, got %d", len(items))
	}
}

func TestSaveItemsJobRejectsInvalidPublishedAt(t *testing.T) {
	st := setupTestStore(t)
	ctx := t.Context()

	feed, err := st.CreateFeed(ctx, store.CreateFeedParams{ID: "f-invalid-date", Url: "feed-invalid-date"})
	if err != nil {
		t.Fatalf("failed to create feed: %v", err)
	}

	invalidPublishedAt := "enewal negotiations."
	job := &SaveItemsJob{
		Items: []store.SaveFetchedItemParams{
			{
				FeedID:      feed.ID,
				Url:         "item-invalid-date",
				PublishedAt: &invalidPublishedAt,
			},
		},
	}

	err = job.Execute(ctx, st.Queries)
	if err == nil || !strings.Contains(err.Error(), "published_at must be RFC3339") {
		t.Fatalf("expected invalid published_at error, got %v", err)
	}

	var count int
	err = st.DB.QueryRowContext(ctx, "SELECT count(*) FROM items WHERE url = ?", "item-invalid-date").Scan(&count)
	if err != nil {
		t.Fatalf("failed to count items: %v", err)
	}
	if count != 0 {
		t.Fatalf("expected invalid item not to be saved, got %d rows", count)
	}
}

func TestSaveItemsJobCleansTrackingParametersBeforeDeduplication(t *testing.T) {
	st := setupTestStore(t)
	ctx := t.Context()

	feed, err := st.CreateFeed(ctx, store.CreateFeedParams{ID: "f-tracking", Url: "https://example.com/feed.xml"})
	if err != nil {
		t.Fatalf("failed to create feed: %v", err)
	}

	job := &SaveItemsJob{
		Items: []store.SaveFetchedItemParams{
			{FeedID: feed.ID, Url: "https://example.com/article?id=123&utm_source=rss", Title: new("RSS")},
			{FeedID: feed.ID, Url: "https://example.com/article?utm_source=social&id=123", Title: new("Social")},
		},
	}

	if err := job.Execute(ctx, st.Queries); err != nil {
		t.Fatalf("failed to save items: %v", err)
	}

	items, err := st.ListItems(ctx, store.StoreListItemsParams{FeedID: feed.ID, Limit: 10, IsBlocked: false})
	if err != nil {
		t.Fatalf("failed to list items: %v", err)
	}
	if len(items) != 1 {
		t.Fatalf("expected one deduplicated item, got %d", len(items))
	}
	if items[0].Url != "https://example.com/article?id=123" {
		t.Errorf("stored URL = %q, want cleaned URL", items[0].Url)
	}
}
