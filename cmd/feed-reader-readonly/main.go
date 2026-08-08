package main

import (
	"context"
	"database/sql"
	"io/fs"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/caarlos0/env/v11"
	"github.com/nakatanakatana/feed-reader/frontend"
	"github.com/nakatanakatana/feed-reader/internal/httpapi"
	"github.com/nakatanakatana/feed-reader/internal/readonly"
	"github.com/nakatanakatana/feed-reader/store"
)

const readonlyCORSMethods = "GET, HEAD, OPTIONS"

var (
	osExit         = os.Exit
	createLogger   = func() *slog.Logger {
		return slog.New(slog.NewJSONHandler(os.Stdout, nil))
	}
	registerVFS    = readonly.RegisterVFS
	openReadOnlyDB = store.OpenReadOnlyDB
	mainCtx        = context.Background()
)

type config struct {
	Port               string        `env:"PORT" envDefault:"8080"`
	ReplicaURL         string        `env:"LITESTREAM_REPLICA_URL"`
	DatabaseName       string        `env:"LITESTREAM_DATABASE_NAME"`
	PollInterval       time.Duration `env:"LITESTREAM_POLL_INTERVAL" envDefault:"1s"`
	CacheSizeBytes     int           `env:"LITESTREAM_CACHE_SIZE_BYTES" envDefault:"10485760"`
	MaxOpenConnections int           `env:"LITESTREAM_MAX_OPEN_CONNECTIONS" envDefault:"4"`
	CORSAllowedOrigins []string      `env:"CORS_ALLOWED_ORIGINS" envSeparator:","`
}

func main() {
	ctx, stop := signal.NotifyContext(mainCtx, os.Interrupt, syscall.SIGTERM)
	defer stop()

	logger := createLogger()

	var cfg config
	if err := env.Parse(&cfg); err != nil {
		logger.ErrorContext(ctx, "failed to parse env", "error", err)
		osExit(1)
	}

	dsn, unregister, err := registerVFS(ctx, readonly.VFSConfig{
		ReplicaURL:     cfg.ReplicaURL,
		DatabaseName:   cfg.DatabaseName,
		PollInterval:   cfg.PollInterval,
		CacheSizeBytes: cfg.CacheSizeBytes,
	}, logger)
	if err != nil {
		logger.ErrorContext(ctx, "failed to register litestream vfs", "error", err)
		osExit(1)
	}

	db, err := openReadOnlyDB(dsn, cfg.MaxOpenConnections)
	if err != nil {
		unregister()
		logger.ErrorContext(ctx, "failed to open readonly database", "error", err)
		osExit(1)
	}

	handler := newMux(db, frontend.Assets, cfg.CORSAllowedOrigins)

	var protocols http.Protocols
	protocols.SetHTTP1(true)
	protocols.SetUnencryptedHTTP2(true)

	server := &http.Server{
		Addr:      ":" + cfg.Port,
		Handler:   handler,
		Protocols: &protocols,
	}

	errCh := make(chan error, 1)
	go func() {
		logger.InfoContext(ctx, "readonly server starting", "port", cfg.Port)
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			errCh <- err
		}
	}()

	var exitCode int
	select {
	case err := <-errCh:
		logger.ErrorContext(ctx, "server failed", "error", err)
		exitCode = 1
	case <-ctx.Done():
		logger.InfoContext(ctx, "shutting down gracefully...")
	}

	// 1. Stop HTTP traffic
	shutdownCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := server.Shutdown(shutdownCtx); err != nil {
		logger.ErrorContext(ctx, "server forced to shutdown", "error", err)
	}

	// 2. Close sql.DB so every wrapper poller stops
	if err := db.Close(); err != nil {
		logger.ErrorContext(ctx, "failed to close database", "error", err)
	}

	// 3. Unregister VFS after all connections are closed
	unregister()

	logger.InfoContext(ctx, "shutdown complete")
	if exitCode != 0 {
		osExit(exitCode)
	}
}

// newMux builds the readonly HTTP surface from a DB and assets only.
// It must not accept or invoke migrations, schedulers, fetchers, or write queues.
func newMux(db *sql.DB, assets fs.FS, allowedOrigins []string) http.Handler {
	s := store.NewStore(db)
	api := httpapi.NewMux(httpapi.Dependencies{
		Store:          s,
		Assets:         assets,
		AllowedOrigins: allowedOrigins,
		AllowedMethods: readonlyCORSMethods,
	})

	mux := http.NewServeMux()
	mux.Handle("/healthz", http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))
	mux.Handle("/readyz", readonly.NewReadinessHandler(db))
	mux.Handle("/", api)
	return readonly.ReadOnlyMiddleware(mux)
}
