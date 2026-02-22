package store

import (
	"context"
	"database/sql"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
)

type ListFeedsParams struct {
	TagID any
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

		// 4. Check for blocking rules
		// We fetch rules inside the transaction for consistency, 
		// but for performance with many items we might want to cache these outside.
		blockRules, err := qtx.ListItemBlockRules(ctx)
		if err != nil {
			return fmt.Errorf("failed to list block rules: %w", err)
		}

		if len(blockRules) > 0 {
			urlRules, err := qtx.ListURLParsingRules(ctx)
			if err != nil {
				return fmt.Errorf("failed to list url parsing rules: %w", err)
			}

			// We need a way to use URLParser here. 
			// Since URLParser is in 'main' package, we can't use it directly in 'store'.
			// We'll implement a simple one or move it. 
			// Given the current structure, let's implement extraction here or move URLParser to a shared package.
			// I'll move URLParser logic to a shared internal logic or redefine it here.
			// Actually, let's just use a simple extraction logic for now or move it to store.
			
			extractedUser, extractedDomain := extractUserInfoLocally(item.Url, urlRules)
			
			fullItem := FullItem{
				ID:      item.ID,
				Url:     item.Url,
				Title:   item.Title,
				Content: item.Content,
			}

			for _, rule := range blockRules {
				if ShouldBlockItem(fullItem, rule, extractedUser, extractedDomain) {
					err := qtx.CreateItemBlock(ctx, CreateItemBlockParams{
						ItemID: item.ID,
						RuleID: rule.ID,
					})
					if err != nil {
						return fmt.Errorf("failed to create item block: %w", err)
					}
				}
			}
		}

		return nil
	})
}

func extractUserInfoLocally(urlStr string, rules []UrlParsingRule) (*string, *string) {
	for _, rule := range rules {
		switch rule.RuleType {
		case "subdomain":
			domainPart := getDomainFromURLLocally(urlStr)
			if strings.HasSuffix(domainPart, "."+rule.Pattern) {
				user := strings.TrimSuffix(domainPart, "."+rule.Pattern)
				if user != "" && !strings.Contains(user, ".") {
					return &user, &rule.Pattern
				}
			}
		case "path":
			if strings.Contains(urlStr, "://"+rule.Pattern+"/") {
				parts := strings.Split(urlStr, "://"+rule.Pattern+"/")
				if len(parts) > 1 {
					userPart := parts[1]
					user := strings.Split(userPart, "/")[0]
					if user != "" {
						domain := strings.Split(rule.Pattern, "/")[0]
						return &user, &domain
					}
				}
			}
		}
	}
	return nil, nil
}

func getDomainFromURLLocally(urlStr string) string {
	parts := strings.Split(urlStr, "://")
	if len(parts) < 2 {
		return ""
	}
	remaining := parts[1]
	domain := strings.Split(remaining, "/")[0]
	domain = strings.Split(domain, ":")[0]
	return domain
}
