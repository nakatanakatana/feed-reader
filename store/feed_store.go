package store

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	"github.com/google/uuid"
)

type ListFeedsParams struct {
	TagID interface{}
}

type Store struct {
	*Queries
	DB *sql.DB
}

func NewStore(db *sql.DB) *Store {
	return &Store{
		Queries: New(NewRetryingDB(db)),
		DB:      db,
	}
}

func (s *Store) ListFeeds(ctx context.Context, params ListFeedsParams) ([]FullFeed, error) {
	rows, err := s.Queries.ListFeeds(ctx, params.TagID)
	if err != nil {
		return nil, err
	}
	feeds := make([]FullFeed, len(rows))
	for i, r := range rows {
		feeds[i] = FullFeed(r)
	}
	return feeds, nil
}

func (s *Store) GetFeed(ctx context.Context, id string) (FullFeed, error) {
	r, err := s.Queries.GetFeed(ctx, id)
	if err != nil {
		return FullFeed{}, err
	}
	return FullFeed(r), nil
}

func (s *Store) GetFeedByURL(ctx context.Context, url string) (FullFeed, error) {
	r, err := s.Queries.GetFeedByURL(ctx, url)
	if err != nil {
		return FullFeed{}, err
	}
	return FullFeed(r), nil
}

func (s *Store) CreateFeed(ctx context.Context, params CreateFeedParams) (FullFeed, error) {
	r, err := s.Queries.CreateFeed(ctx, params)
	if err != nil {
		return FullFeed{}, err
	}
	return FullFeed{
		ID:          r.ID,
		Url:         r.Url,
		Link:        r.Link,
		Title:       r.Title,
		Description: r.Description,
		Lang:        r.Lang,
		ImageUrl:    r.ImageUrl,
		Copyright:   r.Copyright,
		FeedType:    r.FeedType,
		FeedVersion: r.FeedVersion,
		CreatedAt:   r.CreatedAt,
		UpdatedAt:   r.UpdatedAt,
	}, nil
}

func (s *Store) UpdateFeed(ctx context.Context, params UpdateFeedParams) (FullFeed, error) {
	r, err := s.Queries.UpdateFeed(ctx, params)
	if err != nil {
		return FullFeed{}, err
	}
	return FullFeed{
		ID:          r.ID,
		Url:         r.Url,
		Link:        r.Link,
		Title:       r.Title,
		Description: r.Description,
		Lang:        r.Lang,
		ImageUrl:    r.ImageUrl,
		Copyright:   r.Copyright,
		FeedType:    r.FeedType,
		FeedVersion: r.FeedVersion,
		CreatedAt:   r.CreatedAt,
		UpdatedAt:   r.UpdatedAt,
	}, nil
}

func (s *Store) ListFeedsByIDs(ctx context.Context, ids []string) ([]FullFeed, error) {
	rows, err := s.Queries.ListFeedsByIDs(ctx, ids)
	if err != nil {
		return nil, err
	}
	feeds := make([]FullFeed, len(rows))
	for i, r := range rows {
		feeds[i] = FullFeed(r)
	}
	return feeds, nil
}

func (s *Store) BulkCreateFeeds(ctx context.Context, feeds []CreateFeedParams) error {
	if len(feeds) == 0 {
		return nil
	}
	return s.WithTransaction(ctx, func(qtx *Queries) error {
		for _, f := range feeds {
			_, err := qtx.CreateFeed(ctx, f)
			if err != nil {
				return err
			}
		}
		return nil
	})
}

func (s *Store) ListRecentItemPublishedDates(ctx context.Context, feedID string, limit int32) ([]time.Time, error) {
	rows, err := s.Queries.ListRecentItemPublishedDates(ctx, ListRecentItemPublishedDatesParams{
		FeedID: feedID,
		Limit:  int64(limit),
	})
	if err != nil {
		return nil, err
	}

	dates := make([]time.Time, len(rows))
	n := 0
	for _, r := range rows {
		if r == nil {
			continue
		}
		t, err := time.Parse(time.RFC3339, *r)
		if err == nil {
			dates[n] = t
			n++
		}
	}
	return dates[:n], nil
}

// WithTransaction executes the given function within a transaction, retrying on SQLite busy errors.
func (s *Store) WithTransaction(ctx context.Context, fn func(q *Queries) error) error {
	return WithRetry(ctx, func() error {
		tx, err := s.DB.BeginTx(ctx, nil)
		if err != nil {
			return fmt.Errorf("failed to begin transaction: %w", err)
		}
		defer func() {
			_ = tx.Rollback()
		}()

		qtx := New(tx)
		if err := fn(qtx); err != nil {
			return err
		}
		return tx.Commit()
	})
}

type SaveFetchedItemParams struct {
	FeedID      string
	Url         string
	Title       *string
	Description *string
	PublishedAt *string
	Author      *string
	Guid        *string
	Content     *string
	ImageUrl    *string
	Categories  *string
}

// SaveFetchedItem saves an item, links it to the feed, and initializes read status.
// It handles deduplication and ensures atomicity.
func (s *Store) SaveFetchedItem(ctx context.Context, params SaveFetchedItemParams) error {
	return s.WithTransaction(ctx, func(qtx *Queries) error {
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
			Content:     params.Content,
			ImageUrl:    params.ImageUrl,
			Categories:  params.Categories,
		})
		if err != nil {
			return fmt.Errorf("failed to create/update item: %w", err)
		}

		// 2. Link to Feed
		err = qtx.CreateFeedItem(ctx, CreateFeedItemParams{
			FeedID:      params.FeedID,
			ItemID:      item.ID,
			PublishedAt: params.PublishedAt,
		})
		if err != nil {
			return fmt.Errorf("failed to link feed and item: %w", err)
		}

		// 3. Initialize Read Status
		err = qtx.CreateItemRead(ctx, item.ID)
		if err != nil {
			return fmt.Errorf("failed to initialize read status: %w", err)
		}

		return nil
	})
}
