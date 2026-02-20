package main

import (
	"context"
	"log/slog"

	"github.com/nakatanakatana/feed-reader/store"
)

type BlockingBackgroundService struct {
	store             *store.Store
	blockingService   BlockingService
	usernameExtractor UsernameExtractor
	logger            *slog.Logger
}

func NewBlockingBackgroundService(s *store.Store, bs BlockingService, ue UsernameExtractor, l *slog.Logger) *BlockingBackgroundService {
	return &BlockingBackgroundService{
		store:             s,
		blockingService:   bs,
		usernameExtractor: ue,
		logger:            l,
	}
}

func (s *BlockingBackgroundService) ReevaluateAll(ctx context.Context) error {
	s.logger.InfoContext(ctx, "starting re-evaluation of all items against blocking rules")

	rules, err := s.store.ListBlockingRules(ctx)
	if err != nil {
		return err
	}

	parsingRules, err := s.store.ListURLParsingRules(ctx)
	if err != nil {
		return err
	}

	const batchSize = 100
	lastID := ""
	totalItems := 0
	updatedCount := 0

	for {
		items, err := s.store.ListItemsForReevaluation(ctx, store.ListItemsForReevaluationParams{
			ID:    lastID,
			Limit: batchSize,
		})
		if err != nil {
			return err
		}

		if len(items) == 0 {
			break
		}

		for _, item := range items {
			// 1. Re-extract username
			newUsername := ""
			if extracted, err := s.usernameExtractor.Extract(item.Url, parsingRules); err == nil && extracted != "" {
				newUsername = extracted
			}

			// 2. Evaluate blocking
			params := store.SaveFetchedItemParams{
				Url:         item.Url,
				Title:       item.Title,
				Description: item.Description,
				Author:      item.Author,
				Guid:        item.Guid,
				Content:     item.Content,
				ImageUrl:    item.ImageUrl,
				Categories:  item.Categories,
				Username:    nil,
			}
			if newUsername != "" {
				params.Username = &newUsername
			}

			blocked, _ := s.blockingService.ShouldBlock(params, rules)
			newIsHidden := int64(0)
			if blocked {
				newIsHidden = 1
			}

			var usernamePtr *string
			if newUsername != "" {
				usernamePtr = &newUsername
			}

			if item.IsHidden != newIsHidden || (item.Username == nil && usernamePtr != nil) || (item.Username != nil && usernamePtr == nil) || (item.Username != nil && usernamePtr != nil && *item.Username != *usernamePtr) {
				err := s.store.UpdateItemDerivedFields(ctx, store.UpdateItemDerivedFieldsParams{
					ID:       item.ID,
					Username: usernamePtr,
					IsHidden: newIsHidden,
				})
				if err != nil {
					s.logger.ErrorContext(ctx, "failed to update item derived fields", "id", item.ID, "error", err)
					continue
				}
				updatedCount++
			}
			lastID = item.ID
		}
		totalItems += len(items)
	}

	s.logger.InfoContext(ctx, "finished re-evaluation", "total_items", totalItems, "updated_items", updatedCount)
	return nil
}
