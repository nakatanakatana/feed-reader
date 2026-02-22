package main

import (
	"context"
	"database/sql"
	"log/slog"
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
	db, err := sql.Open("sqlite", ":memory:")
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

