package store

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
)

type ListTagsParams struct{}

func (s *Store) ListTags(ctx context.Context, params ListTagsParams) ([]TagWithCount, error) {
	_ = params
	dbTags, err := s.Queries.ListTags(ctx)
	if err != nil {
		return nil, err
	}

	unreadCounts, err := s.CountUnreadItemsPerTag(ctx)
	if err != nil {
		return nil, err
	}

	feedCounts, err := s.CountFeedsPerTag(ctx)
	if err != nil {
		return nil, err
	}

	countMap := make(map[string]int64)
	for _, c := range unreadCounts {
		countMap[c.TagID] = c.Count
	}

	feedCountMap := make(map[string]int64)
	for _, c := range feedCounts {
		feedCountMap[c.TagID] = c.Count
	}

	tags := make([]TagWithCount, len(dbTags))
	for i, t := range dbTags {
		tags[i] = TagWithCount{
			ID:          t.ID,
			Name:        t.Name,
			CreatedAt:   t.CreatedAt,
			UpdatedAt:   t.UpdatedAt,
			UnreadCount: countMap[t.ID],
			FeedCount:   feedCountMap[t.ID],
		}
	}

	return tags, nil
}

// SetFeedTags updates the tags associated with a feed.
func (s *Store) SetFeedTags(ctx context.Context, feedID string, tagIDs []string) error {
	return s.WithTransaction(ctx, func(qtx *Queries) error {
		// 1. Delete existing associations
		if err := qtx.DeleteFeedTags(ctx, feedID); err != nil {
			return fmt.Errorf("failed to delete existing feed tags: %w", err)
		}

		// 2. Insert new associations
		for _, tagID := range tagIDs {
			err := qtx.CreateFeedTag(ctx, CreateFeedTagParams{
				FeedID: feedID,
				TagID:  tagID,
			})
			if err != nil {
				return fmt.Errorf("failed to create feed tag association: %w", err)
			}
		}
		return nil
	})
}

// ManageFeedTags handles bulk adding and removing tags for multiple feeds.
func (s *Store) ManageFeedTags(ctx context.Context, feedIDs []string, addTagIDs []string, removeTagIDs []string) error {
	return s.WithTransaction(ctx, func(qtx *Queries) error {
		for _, feedID := range feedIDs {
			// 1. Remove tags
			for _, tagID := range removeTagIDs {
				err := qtx.DeleteFeedTag(ctx, DeleteFeedTagParams{
					FeedID: feedID,
					TagID:  tagID,
				})
				if err != nil {
					return fmt.Errorf("failed to remove tag %s from feed %s: %w", tagID, feedID, err)
				}
			}

			// 2. Add tags
			for _, tagID := range addTagIDs {
				err := qtx.CreateFeedTag(ctx, CreateFeedTagParams{
					FeedID: feedID,
					TagID:  tagID,
				})
				if err != nil {
					return fmt.Errorf("failed to add tag %s to feed %s: %w", tagID, feedID, err)
				}
			}
		}
		return nil
	})
}

func (s *Store) ListTagsByFeedId(ctx context.Context, feedID string) ([]Tag, error) {
	return s.Queries.ListTagsByFeedId(ctx, feedID)
}

func (s *Store) ListTagsByFeedIDs(ctx context.Context, feedIDs []string) ([]ListTagsByFeedIDsRow, error) {
	return s.Queries.ListTagsByFeedIDs(ctx, feedIDs)
}

func (s *Store) BulkCreateTags(ctx context.Context, tags []CreateTagParams) error {
	return fmt.Errorf("not implemented")
}

func (s *Store) BulkCreateFeedTags(ctx context.Context, feedTags []CreateFeedTagParams) error {
	return fmt.Errorf("not implemented")
}

// GetOrCreateTag returns a tag by name, creating it if it doesn't exist.
func (s *Store) GetOrCreateTag(ctx context.Context, name string, uuidGen UUIDGenerator) (*Tag, error) {
	tag, err := s.GetTagByName(ctx, name)
	if err == nil {
		return &tag, nil
	}
	if !errors.Is(err, sql.ErrNoRows) {
		return nil, err
	}

	if uuidGen == nil {
		return nil, fmt.Errorf("uuidGen is required to create a new tag")
	}

	newUUID, err := uuidGen.NewRandom()
	if err != nil {
		return nil, err
	}

	newTag, err := s.CreateTag(ctx, CreateTagParams{
		ID:   newUUID.String(),
		Name: name,
	})
	if err != nil {
		// Handle possible race where another request created the tag concurrently.
		existingTag, getErr := s.GetTagByName(ctx, name)
		if getErr == nil {
			return &existingTag, nil
		}
		if errors.Is(getErr, sql.ErrNoRows) {
			// Tag still does not exist; return the original create error.
			return nil, err
		}
		// Unexpected error when re-fetching; include both errors for debugging.
		return nil, fmt.Errorf("GetTagByName after CreateTag error failed: %w (original create error: %v)", getErr, err)
	}

	return &newTag, nil
}
