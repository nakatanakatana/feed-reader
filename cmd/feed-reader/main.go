package main

import (
	"context"
	"database/sql"
	"log/slog"
	"net/http"
	"os"

	_ "github.com/mattn/go-sqlite3"
	"github.com/nakatanakatana/feed-reader/gen/go/feed/v1/feedv1connect"
	"github.com/nakatanakatana/feed-reader/sql"
	"github.com/nakatanakatana/feed-reader/store"
	"golang.org/x/net/http2"
	"golang.org/x/net/http2/h2c"
)

func main() {
	ctx := context.Background()
	logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))

	db, err := sql.Open("sqlite3", "feed-reader.db")
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
	feedServer := NewFeedServer(queries)
	path, handler := feedv1connect.NewFeedServiceHandler(feedServer)

	mux := http.NewServeMux()
	mux.Handle(path, handler)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	logger.InfoContext(ctx, "server starting", "port", port)
	server := &http.Server{
		Addr:    ":" + port,
		Handler: h2c.NewHandler(mux, &http2.Server{}),
	}

	if err := server.ListenAndServe(); err != nil {
		logger.ErrorContext(ctx, "server failed", "error", err)
		os.Exit(1)
	}
}