package store

import (
	"context"
)

func (s *Store) CreateURLParsingRule(ctx context.Context, params CreateURLParsingRuleParams) (UrlParsingRule, error) {
	var rule UrlParsingRule
	err := s.WithTransaction(ctx, func(qtx *Queries) error {
		existing, err := qtx.GetURLParsingRuleByDomain(ctx, GetURLParsingRuleByDomainParams{
			Domain:   params.Domain,
			RuleType: params.RuleType,
		})
		if err == nil {
			rule = existing
			return nil
		}

		rule, err = qtx.CreateURLParsingRule(ctx, params)
		return err
	})
	return rule, err
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
