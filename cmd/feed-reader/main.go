package main

import (
	"context"
	"database/sql"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/caarlos0/env/v11"
	_ "github.com/mattn/go-sqlite3"
	"github.com/nakatanakatana/feed-reader/gen/go/feed/v1/feedv1connect"
	"github.com/nakatanakatana/feed-reader/sql"
	"github.com/nakatanakatana/feed-reader/store"
	"golang.org/x/net/http2"
	"golang.org/x/net/http2/h2c"
)

type config struct {
	Port          string        `env:"PORT" envDefault:"8080"`
	DBPath        string        `env:"DB_PATH" envDefault:"feed-reader.db"`
	FetchInterval time.Duration `env:"FETCH_INTERVAL" envDefault:"10m"`
	MaxWorkers    int           `env:"MAX_WORKERS" envDefault:"5"`
}

func main() {
	// Root context for the whole application
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

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

	// 1. Initialize Storage
	s := store.NewStore(db)

	// 2. Initialize Worker Pool
	pool := NewWorkerPool(cfg.MaxWorkers)
	pool.Start(ctx)

	// 3. Initialize Fetcher components
	fetcher := NewGofeedFetcher()
	fetchService := NewFetcherService(s, fetcher, pool, logger)

	// 4. Initialize Scheduler
	scheduler := NewScheduler(cfg.FetchInterval, fetchService.FetchAllFeeds)
	go scheduler.Start(ctx)

	// 5. Initialize API Server
	feedServer := NewFeedServer(s.Queries, nil, fetcher)
	path, handler := feedv1connect.NewFeedServiceHandler(feedServer)

	mux := http.NewServeMux()
	mux.Handle(path, handler)

	server := &http.Server{
		Addr:    ":" + cfg.Port,
		Handler: h2c.NewHandler(mux, &http2.Server{}),
	}

	// Run server in a goroutine
	go func() {
		logger.InfoContext(ctx, "server starting", "port", cfg.Port)
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			logger.ErrorContext(ctx, "server failed", "error", err)
			os.Exit(1)
		}
	}()

	// Wait for interruption signal
	<-ctx.Done()
	logger.InfoContext(ctx, "shutting down gracefully...")

	// Shutdown HTTP server
	shutdownCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := server.Shutdown(shutdownCtx); err != nil {
		logger.ErrorContext(ctx, "server forced to shutdown", "error", err)
	}

	// Wait for worker pool to finish current tasks
	pool.Wait()

	logger.InfoContext(ctx, "shutdown complete")
}