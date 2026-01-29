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
	"github.com/nakatanakatana/feed-reader/gen/go/feed/v1/feedv1connect"
	"github.com/nakatanakatana/feed-reader/gen/go/item/v1/itemv1connect"
	"github.com/nakatanakatana/feed-reader/gen/go/tag/v1/tagv1connect"
	"github.com/nakatanakatana/feed-reader/sql"
	"github.com/nakatanakatana/feed-reader/store"
	"golang.org/x/net/http2"
	"golang.org/x/net/http2/h2c"
	_ "modernc.org/sqlite"
)

type config struct {
	Port                   string        `env:"PORT" envDefault:"8080"`
	DBPath                 string        `env:"DB_PATH" envDefault:"feed-reader.db"`
	FetchInterval          time.Duration `env:"FETCH_INTERVAL" envDefault:"30m"`
	MaxWorkers             int           `env:"MAX_WORKERS" envDefault:"10"`
	MigrateContentMarkdown bool          `env:"MIGRATE_CONTENT_MARKDOWN" envDefault:"false"`
	SkipDBMigration        bool          `env:"SKIP_DB_MIGRATION" envDefault:"false"`
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

	// Initialize schema
	if err := schema.Migrate(ctx, cfg.DBPath, schema.Schema, cfg.SkipDBMigration); err != nil {
		logger.ErrorContext(ctx, "failed to migrate database", "error", err)
		os.Exit(1)
	}

	db, err := sql.Open("sqlite", cfg.DBPath)
	if err != nil {
		logger.ErrorContext(ctx, "failed to open database", "error", err)
		os.Exit(1)
	}
	defer func() {
		if err := db.Close(); err != nil {
			logger.ErrorContext(ctx, "failed to close database", "error", err)
		}
	}()

	// 1. Initialize Storage
	s := store.NewStore(db)

	if cfg.MigrateContentMarkdown {
		if err := migrateHTMLToMarkdown(ctx, s, logger); err != nil {
			logger.ErrorContext(ctx, "migration failed", "error", err)
			os.Exit(1)
		}
		os.Exit(0)
	}

	// 2. Initialize Worker Pool
	pool := NewWorkerPool(cfg.MaxWorkers)
	pool.Start(ctx)

	// 3. Initialize Fetcher components
	fetcher := NewGofeedFetcher()
	fetchService := NewFetcherService(s, fetcher, pool, logger, cfg.FetchInterval)

	// 4. Initialize Scheduler
	// Add random jitter up to 10% of interval
	jitter := time.Duration(float64(cfg.FetchInterval) * 0.1)
	scheduler := NewScheduler(cfg.FetchInterval, jitter, fetchService.FetchAllFeeds)
	go scheduler.Start(ctx)

	// 5. Initialize API Server
	feedServer := NewFeedServer(s, nil, fetcher, fetchService)
	feedPath, feedHandler := feedv1connect.NewFeedServiceHandler(feedServer)

	itemServer := NewItemServer(s)
	itemPath, itemHandler := itemv1connect.NewItemServiceHandler(itemServer)

	tagServer := NewTagServer(s, nil)
	tagPath, tagHandler := tagv1connect.NewTagServiceHandler(tagServer)

	mux := http.NewServeMux()
	mux.Handle("/api"+feedPath, http.StripPrefix("/api", feedHandler))
	mux.Handle("/api"+itemPath, http.StripPrefix("/api", itemHandler))
	mux.Handle("/api"+tagPath, http.StripPrefix("/api", tagHandler))

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
