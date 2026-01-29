package main

import (
	"context"
	"fmt"
	"log/slog"
	"time"

	"github.com/google/uuid"
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

// Start runs the background worker loop.
func (s *WriteQueueService) Start(ctx context.Context) {
	s.logger.InfoContext(ctx, "starting write queue service",
		"max_batch_size", s.config.MaxBatchSize,
		"flush_interval", s.config.FlushInterval)

	batch := make([]WriteQueueJob, 0, s.config.MaxBatchSize)
	ticker := time.NewTicker(s.config.FlushInterval)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			// Drain remaining jobs from the channel
			drain := true
			for drain {
				select {
				case job := <-s.jobs:
					batch = append(batch, job)
				default:
					drain = false
				}
			}
			s.logger.InfoContext(ctx, "shutting down write queue service, flushing remaining jobs", "count", len(batch))
			s.flush(context.Background(), batch)
			return
		case job := <-s.jobs:
			batch = append(batch, job)
			if len(batch) >= s.config.MaxBatchSize {
				s.flush(ctx, batch)
				batch = make([]WriteQueueJob, 0, s.config.MaxBatchSize)
				ticker.Reset(s.config.FlushInterval)
			}
		case <-ticker.C:
			if len(batch) > 0 {
				s.flush(ctx, batch)
				batch = make([]WriteQueueJob, 0, s.config.MaxBatchSize)
			}
		}
	}
}

func (s *WriteQueueService) flush(ctx context.Context, batch []WriteQueueJob) {
	if len(batch) == 0 {
		return
	}

	s.logger.DebugContext(ctx, "flushing batch", "count", len(batch))

	err := s.store.WithTransaction(ctx, func(qtx *store.Queries) error {
		for _, job := range batch {
			if err := job.Execute(ctx, qtx); err != nil {
				s.logger.ErrorContext(ctx, "failed to execute job in batch", "error", err)
				// We continue with other jobs in the same transaction for now,
				// or should we rollback the whole batch?
				// SQLite transactions are all or nothing, so returning err here rollbacks.
				return err
			}
		}
		return nil
	})

	if err != nil {
		s.logger.ErrorContext(ctx, "batch transaction failed", "error", err)
	}
}

// SaveItemsJob represents a job to save multiple items for a feed.
type SaveItemsJob struct {
	Items []store.SaveFetchedItemParams
}

// Execute performs the save operations.
func (j *SaveItemsJob) Execute(ctx context.Context, q *store.Queries) error {
	for _, params := range j.Items {
		// 1. Upsert Item
		newID := uuid.NewString()
		item, err := q.CreateItem(ctx, store.CreateItemParams{
			ID:          newID,
			Url:         params.Url,
			Title:       params.Title,
			Description: params.Description,
			PublishedAt: params.PublishedAt,
			Author:      params.Author,
			Guid:        params.Guid,
			Content:     params.Content,
			ImageUrl:    params.ImageUrl,
			Categories:  params.Categories,
		})
		if err != nil {
			return fmt.Errorf("failed to create/update item: %w", err)
		}

		// 2. Link to Feed
		err = q.CreateFeedItem(ctx, store.CreateFeedItemParams{
			FeedID: params.FeedID,
			ItemID: item.ID,
		})
		if err != nil {
			return fmt.Errorf("failed to link feed and item: %w", err)
		}

		// 3. Initialize Read Status
		err = q.CreateItemRead(ctx, item.ID)
		if err != nil {
			return fmt.Errorf("failed to initialize read status: %w", err)
		}
	}
	return nil
}

// UpdateFeedJob represents a job to update feed metadata.
type UpdateFeedJob struct {
	Params store.UpdateFeedParams
}

// Execute performs the update operation.
func (j *UpdateFeedJob) Execute(ctx context.Context, q *store.Queries) error {
	_, err := q.UpdateFeed(ctx, j.Params)
	return err
}
