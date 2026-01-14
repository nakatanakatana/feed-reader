package main

import (
	"context"
	"database/sql"
	"log/slog"
	"net/http"
	"os"

	"github.com/caarlos0/env/v11"
	_ "github.com/mattn/go-sqlite3"
	"github.com/nakatanakatana/feed-reader/gen/go/feed/v1/feedv1connect"
	"github.com/nakatanakatana/feed-reader/sql"
	"github.com/nakatanakatana/feed-reader/store"
	"golang.org/x/net/http2"
	"golang.org/x/net/http2/h2c"
)

type config struct {
	Port   string `env:"PORT" envDefault:"8080"`
	DBPath string `env:"DB_PATH" envDefault:"feed-reader.db"`
}

func main() {
	ctx := context.Background()
	logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))

	var cfg config
	if err := env.Parse(&cfg); err != nil {
		logger.ErrorContext(ctx, "failed to parse env", "error", err)
		os.Exit(1)
	}

	db, err := sql.Open("sqlite3", cfg.DBPath)
	if err != nil {
		logger.ErrorContext(ctx, "failed to open database", "error", err)
		os.Exit(1)
	}
	defer func() {
		if err := db.Close(); err != nil {
			logger.ErrorContext(ctx, "failed to close database", "error", err)
		}
	}()

	// Initialize schema
	if _, err := db.ExecContext(ctx, schema.Schema); err != nil {
		logger.ErrorContext(ctx, "failed to create schema", "error", err)
		os.Exit(1)
	}

	queries := store.New(db)
	fetcher := NewGofeedFetcher()
	feedServer := NewFeedServer(queries, nil, fetcher)
	path, handler := feedv1connect.NewFeedServiceHandler(feedServer)

	mux := http.NewServeMux()
	mux.Handle(path, handler)

	logger.InfoContext(ctx, "server starting", "port", cfg.Port)
	server := &http.Server{
		Addr:    ":" + cfg.Port,
		Handler: h2c.NewHandler(mux, &http2.Server{}),
	}

	if err := server.ListenAndServe(); err != nil {
		logger.ErrorContext(ctx, "server failed", "error", err)
		os.Exit(1)
	}
}
