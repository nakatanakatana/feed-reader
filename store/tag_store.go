package store

import (
	"context"
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
