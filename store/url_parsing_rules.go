package store

import (
	"context"
)

func (s *Store) CreateURLParsingRule(ctx context.Context, params CreateURLParsingRuleParams) (UrlParsingRule, error) {
	return s.Queries.CreateURLParsingRule(ctx, params)
}

func (s *Store) ListURLParsingRules(ctx context.Context) ([]UrlParsingRule, error) {
	return s.Queries.ListURLParsingRules(ctx)
}

func (s *Store) GetURLParsingRule(ctx context.Context, id string) (UrlParsingRule, error) {
	return s.Queries.GetURLParsingRule(ctx, id)
}

func (s *Store) DeleteURLParsingRule(ctx context.Context, id string) error {
	return s.Queries.DeleteURLParsingRule(ctx, id)
}
