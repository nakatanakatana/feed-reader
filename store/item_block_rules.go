package store

import (
	"context"
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
