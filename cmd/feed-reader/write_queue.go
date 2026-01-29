package main

import (
	"context"

	"github.com/nakatanakatana/feed-reader/store"
)

// WriteQueueJob defines the interface for jobs processed by the write queue.
type WriteQueueJob interface {
	Execute(ctx context.Context, q *store.Queries) error
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
