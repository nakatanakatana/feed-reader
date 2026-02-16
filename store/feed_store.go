package store

import (
	"context"
	"database/sql"
	"fmt"

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
	Authors     []AuthorParams
	Guid        *string
	Content     *string
	ImageUrl    *string
	Categories  *string
}

// SaveFetchedItem saves an item, links it to the feed, and initializes read status.
// It handles deduplication and ensures atomicity.
func (s *Store) SaveFetchedItem(ctx context.Context, params SaveFetchedItemParams) error {
	return s.WithTransaction(ctx, func(qtx *Queries) error {
		return s.SaveFetchedItemTx(ctx, qtx, params)
	})
}

// SaveFetchedItemTx performs the actual save operations within a provided transaction.
func (s *Store) SaveFetchedItemTx(ctx context.Context, qtx *Queries, params SaveFetchedItemParams) error {
	// 1. Upsert Item
	newID := uuid.NewString()
	item, err := qtx.CreateItem(ctx, CreateItemParams{
		ID:          newID,
		Url:         params.Url,
		Title:       params.Title,
		Description: params.Description,
		PublishedAt: params.PublishedAt,
		Guid:        params.Guid,
		Content:     params.Content,
		ImageUrl:    params.ImageUrl,
		Categories:  params.Categories,
	})
	if err != nil {
		return fmt.Errorf("failed to create/update item: %w", err)
	}

	// 2. Save Authors and Link to Item
	for _, author := range params.Authors {
		a, err := qtx.CreateAuthor(ctx, CreateAuthorParams{
			ID:    uuid.NewString(),
			Name:  author.Name,
			Email: author.Email,
			Uri:   author.Uri,
		})
		if err != nil {
			return fmt.Errorf("failed to create/update author: %w", err)
		}

		err = qtx.CreateItemAuthor(ctx, CreateItemAuthorParams{
			ItemID:   item.ID,
			AuthorID: a.ID,
		})
		if err != nil {
			return fmt.Errorf("failed to link item and author: %w", err)
		}
	}

	// 3. Link to Feed
	err = qtx.CreateFeedItem(ctx, CreateFeedItemParams{
		FeedID:      params.FeedID,
		ItemID:      item.ID,
		PublishedAt: params.PublishedAt,
	})
	if err != nil {
		return fmt.Errorf("failed to link feed and item: %w", err)
	}

	// 4. Initialize Read Status
	err = qtx.CreateItemRead(ctx, item.ID)
	if err != nil {
		return fmt.Errorf("failed to initialize read status: %w", err)
	}

	return nil
}

func (s *Store) GetItemWithAuthors(ctx context.Context, id string) (ItemWithAuthors, error) {
	row, err := s.GetItem(ctx, id)
	if err != nil {
		return ItemWithAuthors{}, err
	}

	authors, err := s.ListItemAuthors(ctx, row.ID)
	if err != nil {
		return ItemWithAuthors{}, err
	}

	return ItemWithAuthors{
		ID:          row.ID,
		Url:         row.Url,
		Title:       row.Title,
		Description: row.Description,
		PublishedAt: row.PublishedAt,
		Guid:        row.Guid,
		Content:     row.Content,
		ImageUrl:    row.ImageUrl,
		Categories:  row.Categories,
		CreatedAt:   row.CreatedAt,
		FeedID:      row.FeedID,
		IsRead:      row.IsRead == 1,
		Authors:     authors,
	}, nil
}

type ListItemsWithAuthorsParams struct {
	FeedID interface{}
	IsRead interface{}
	TagID  interface{}
	Since  interface{}
	Limit  int64
	Offset int64
}

func (s *Store) ListItemsWithAuthors(ctx context.Context, params ListItemsWithAuthorsParams) ([]ItemWithAuthors, int64, error) {
	totalCount, err := s.CountItems(ctx, CountItemsParams{
		FeedID: params.FeedID,
		IsRead: params.IsRead,
		TagID:  params.TagID,
		Since:  params.Since,
	})
	if err != nil {
		return nil, 0, err
	}

	rows, err := s.ListItems(ctx, ListItemsParams{
		FeedID: params.FeedID,
		IsRead: params.IsRead,
		TagID:  params.TagID,
		Since:  params.Since,
		Limit:  params.Limit,
		Offset: params.Offset,
	})
	if err != nil {
		return nil, 0, err
	}

	if len(rows) == 0 {
		return nil, totalCount, nil
	}

	itemIDs := make([]string, len(rows))
	for i, r := range rows {
		itemIDs[i] = r.ID
	}

	allAuthors, err := s.ListItemAuthorsByItemIDs(ctx, itemIDs)
	if err != nil {
		return nil, 0, err
	}

	authorsMap := make(map[string][]Author)
	for _, a := range allAuthors {
		authorsMap[a.ItemID] = append(authorsMap[a.ItemID], Author{
			ID:        a.ID,
			Name:      a.Name,
			Email:     a.Email,
			Uri:       a.Uri,
			// CreatedAt/UpdatedAt are not returned by ListItemAuthorsByItemIDs for efficiency,
			// but we can add them if needed. For now, let's keep it simple.
		})
	}

	items := make([]ItemWithAuthors, len(rows))
	for i, r := range rows {
		items[i] = ItemWithAuthors{
			ID:          r.ID,
			Url:         r.Url,
			Title:       r.Title,
			Description: &r.Description,
			PublishedAt: r.PublishedAt,
			Guid:        r.Guid,
			Content:     r.Content,
			ImageUrl:    r.ImageUrl,
			Categories:  r.Categories,
			CreatedAt:   r.CreatedAt,
			FeedID:      r.FeedID,
			IsRead:      r.IsRead == 1,
			Authors:     authorsMap[r.ID],
		}
		if items[i].Authors == nil {
			items[i].Authors = []Author{}
		}
	}

	return items, totalCount, nil
}
