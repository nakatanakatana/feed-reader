package main

import (
	"context"
	"log/slog"
	"time"

	"github.com/nakatanakatana/feed-reader/store"
)

// WriteQueueJob defines the interface for jobs processed by the write queue.
type WriteQueueJob interface {
	Execute(ctx context.Context, q *store.Queries) error
}

// WriteQueueConfig defines the configuration for the write queue service.
type WriteQueueConfig struct {
	MaxBatchSize  int
	FlushInterval time.Duration
}

// WriteQueueService manages a queue of write operations for SQLite.
type WriteQueueService struct {
	store  *store.Store
	config WriteQueueConfig
	logger *slog.Logger
	jobs   chan WriteQueueJob
}

// NewWriteQueueService creates a new WriteQueueService.
func NewWriteQueueService(s *store.Store, cfg WriteQueueConfig, l *slog.Logger) *WriteQueueService {
	return &WriteQueueService{
		store:  s,
		config: cfg,
		logger: l,
		jobs:   make(chan WriteQueueJob, cfg.MaxBatchSize*2),
	}
}

// Submit adds a job to the queue.
func (s *WriteQueueService) Submit(job WriteQueueJob) {
	s.jobs <- job
}

// SaveItemsJob represents a job to save multiple items for a feed.
type SaveItemsJob struct {
	Items []store.SaveFetchedItemParams
}

// Execute performs the save operations.
func (j *SaveItemsJob) Execute(ctx context.Context, q *store.Queries) error {
	// Implementation will be added in Phase 2.
	return nil
}

// UpdateFeedJob represents a job to update feed metadata.
type UpdateFeedJob struct {
	Params store.UpdateFeedParams
}

// Execute performs the update operation.
func (j *UpdateFeedJob) Execute(ctx context.Context, q *store.Queries) error {
	// Implementation will be added in Phase 2.
	_, err := q.UpdateFeed(ctx, j.Params)
	return err
}
