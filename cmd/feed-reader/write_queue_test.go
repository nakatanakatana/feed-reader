package main

import (
	"context"
	"database/sql"
	"log/slog"
	"testing"
	"time"

	"github.com/nakatanakatana/feed-reader/store"
	schema "github.com/nakatanakatana/feed-reader/sql"
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
		db.Close()
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
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

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

func TestWriteQueueServiceLoopTimeTrigger(t *testing.T) {
	cfg := WriteQueueConfig{
		MaxBatchSize:  10,
		FlushInterval: 50 * time.Millisecond,
	}
	st := setupTestStore(t)
	s := NewWriteQueueService(st, cfg, slog.Default())
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	go s.Start(ctx)

	job := &MockJob{}
	s.Submit(job)

	// Wait for processing (longer than FlushInterval)
	time.Sleep(100 * time.Millisecond)

	if !job.executed {
		t.Error("expected job to be executed when FlushInterval expires")
	}
}
