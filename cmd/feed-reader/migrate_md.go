package main

import (
	"context"
	"log/slog"

	"github.com/nakatanakatana/feed-reader/store"
)

func migrateHTMLToMarkdown(ctx context.Context, s *store.Store, logger *slog.Logger) error {
	items, err := s.ListAllItems(ctx)
	if err != nil {
		return err
	}

	logger.InfoContext(ctx, "starting HTML to Markdown migration", "count", len(items))

	for _, item := range items {
		updated := false
		newDesc := item.Description
		newContent := item.Content

		if item.Description != nil && *item.Description != "" {
			mdDesc, err := ConvertHTMLToMarkdown(*item.Description)
			if err == nil && mdDesc != *item.Description {
				newDesc = &mdDesc
				updated = true
			}
		}

		if item.Content != nil && *item.Content != "" {
			mdContent, err := ConvertHTMLToMarkdown(*item.Content)
			if err == nil && mdContent != *item.Content {
				newContent = &mdContent
				updated = true
			}
		}

		if updated {
			err := s.UpdateItemContent(ctx, store.UpdateItemContentParams{
				Description: newDesc,
				Content:     newContent,
				ID:          item.ID,
			})
			if err != nil {
				logger.ErrorContext(ctx, "failed to update item during migration", "id", item.ID, "error", err)
			}
		}
	}

	logger.InfoContext(ctx, "HTML to Markdown migration complete")
	return nil
}
