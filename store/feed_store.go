package store

import (
	"context"
	"database/sql"
	"fmt"

	"github.com/google/uuid"
)

type Store struct {
	*Queries
	DB *sql.DB
}

func NewStore(db *sql.DB) *Store {
	return &Store{
		Queries: New(db),
		DB:      db,
	}
}

type SaveFetchedItemParams struct {
	FeedID      string
	Url         string
	Title       *string
	Description *string
	PublishedAt *string
	Author      *string
	Guid        *string
}

// SaveFetchedItem saves an item, links it to the feed, and initializes read status.
// It handles deduplication and ensures atomicity.
func (s *Store) SaveFetchedItem(ctx context.Context, params SaveFetchedItemParams) error {
	tx, err := s.DB.BeginTx(ctx, nil)
	if err != nil {
		return fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer func() {
		_ = tx.Rollback()
	}()

	qtx := s.WithTx(tx)

	// 1. Upsert Item
	newID := uuid.NewString()
	item, err := qtx.CreateItem(ctx, CreateItemParams{
		ID:          newID,
		Url:         params.Url,
		Title:       params.Title,
		Description: params.Description,
		PublishedAt: params.PublishedAt,
		Author:      params.Author,
		Guid:        params.Guid,
	})
	if err != nil {
		return fmt.Errorf("failed to create/update item: %w", err)
	}

	// 2. Link to Feed
	err = qtx.CreateFeedItem(ctx, CreateFeedItemParams{
		FeedID: params.FeedID,
		ItemID: item.ID,
	})
	if err != nil {
		return fmt.Errorf("failed to link feed and item: %w", err)
	}

	// 3. Initialize Read Status
	err = qtx.CreateItemRead(ctx, item.ID)
	if err != nil {
		return fmt.Errorf("failed to initialize read status: %w", err)
	}

	return tx.Commit()
}
