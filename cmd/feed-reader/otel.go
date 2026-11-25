package main

import (
	"context"
	"log/slog"

	"github.com/nakatanakatana/feed-reader/internal/telemetry"
)

func InitOTEL(ctx context.Context, logger *slog.Logger) (func(context.Context) error, error) {
	return telemetry.Init(ctx, "feed-reader", logger)
}
