package store

import (
	"context"
	"strings"
)

func (s *Store) CreateItemBlockRule(ctx context.Context, params CreateItemBlockRuleParams) (ItemBlockRule, error) {
	return s.Queries.CreateItemBlockRule(ctx, params)
}

func (s *Store) CreateItemBlockRules(ctx context.Context, params []CreateItemBlockRuleParams) error {
	return s.WithTransaction(ctx, func(qtx *Queries) error {
		for _, p := range params {
			if _, err := qtx.CreateItemBlockRule(ctx, p); err != nil {
				return err
			}
		}
		return nil
	})
}

func (s *Store) ListItemBlockRules(ctx context.Context) ([]ItemBlockRule, error) {
	return s.Queries.ListItemBlockRules(ctx)
}

func (s *Store) DeleteItemBlockRule(ctx context.Context, id string) error {
	return s.Queries.DeleteItemBlockRule(ctx, id)
}

func (s *Store) CreateItemBlock(ctx context.Context, params CreateItemBlockParams) error {
	return s.Queries.CreateItemBlock(ctx, params)
}

func (s *Store) ListItemBlocks(ctx context.Context, itemID string) ([]ItemBlock, error) {
	return s.Queries.ListItemBlocks(ctx, itemID)
}

func (s *Store) ListItemsForBlocking(ctx context.Context) ([]FullItem, error) {
	rows, err := s.Queries.ListItemsForBlocking(ctx)
	if err != nil {
		return nil, err
	}
	items := make([]FullItem, len(rows))
	for i, r := range rows {
		items[i] = FullItem{
			ID:          r.ID,
			Url:         r.Url,
			Title:       r.Title,
			Description: r.Description,
			PublishedAt: r.PublishedAt,
			Author:      r.Author,
			Guid:        r.Guid,
			Content:     r.Content,
			ImageUrl:    r.ImageUrl,
			Categories:  r.Categories,
			CreatedAt:   r.CreatedAt,
			UpdatedAt:   r.UpdatedAt,
			FeedID:      r.FeedID,
			IsRead:      r.IsRead == 1,
		}
	}
	return items, nil
}

// ShouldBlockItem determines if an item should be blocked based on a rule.
// extractedInfo is optional and should be provided if available (e.g. from URLParser).
func ShouldBlockItem(item FullItem, rule ItemBlockRule, extractedUser *string, extractedDomain *string) bool {
	switch rule.RuleType {
	case "user":
		return extractedUser != nil && *extractedUser == rule.RuleValue
	case "domain":
		return extractedDomain != nil && *extractedDomain == rule.RuleValue
	case "user_domain":
		if rule.Domain == nil {
			return false
		}
		return extractedUser != nil && *extractedUser == rule.RuleValue && extractedDomain != nil && *extractedDomain == *rule.Domain
	case "keyword":
		// Check title and content for keyword
		if item.Title != nil && containsKeyword(*item.Title, rule.RuleValue) {
			return true
		}
		if item.Content != nil && containsKeyword(*item.Content, rule.RuleValue) {
			return true
		}
		return false
	}
	return false
}

func containsKeyword(s, keyword string) bool {
	return strings.Contains(strings.ToLower(s), strings.ToLower(keyword))
}

// PopulateItemBlocksForRule scans all items and populates item_blocks for the given rule.
// extractedInfoMap is a map from item URL to extracted user and domain info.
func (s *Store) PopulateItemBlocksForRule(ctx context.Context, rule ItemBlockRule, extractedInfoMap map[string]ExtractedUserInfo) error {
	items, err := s.ListItemsForBlocking(ctx)
	if err != nil {
		return err
	}

	return s.WithTransaction(ctx, func(qtx *Queries) error {
		for _, item := range items {
			var user, domain *string
			if info, ok := extractedInfoMap[item.Url]; ok {
				user = &info.User
				domain = &info.Domain
			}

			if ShouldBlockItem(item, rule, user, domain) {
				err := qtx.CreateItemBlock(ctx, CreateItemBlockParams{
					ItemID: item.ID,
					RuleID: rule.ID,
				})
				if err != nil {
					return err
				}
			}
		}
		return nil
	})
}
