package readonly

import (
	"context"
	"fmt"
	"log/slog"
	"net/url"
	"sync"
	"time"

	"github.com/benbjohnson/litestream"
	_ "github.com/benbjohnson/litestream/file" // register file replica client factory
	_ "github.com/benbjohnson/litestream/s3"   // register s3 replica client factory
	litestreamvfs "github.com/nakatanakatana/mytools/cmd/litestream-vfs-wrapper"
	ncrucesvfs "github.com/ncruces/go-sqlite3/vfs"
)

const vfsName = "feed-reader-litestream"

// VFSConfig configures Litestream replica access for the read-only VFS.
type VFSConfig struct {
	ReplicaURL     string
	DatabaseName   string
	PollInterval   time.Duration
	CacheSizeBytes int
}

// RegisterVFS validates cfg, registers the mytools Litestream VFS with ncruces,
// and returns a read-only DSN plus an idempotent unregister cleanup.
//
// Callers must close any sql.DB opened with the returned DSN before calling
// unregister so every wrapper file closes and its per-connection poller stops.
func RegisterVFS(ctx context.Context, cfg VFSConfig, logger *slog.Logger) (dsn string, unregister func(), err error) {
	if err := validateVFSConfig(cfg); err != nil {
		return "", nil, err
	}

	client, err := litestream.NewReplicaClientFromURL(cfg.ReplicaURL)
	if err != nil {
		return "", nil, fmt.Errorf("create replica client: %w", err)
	}
	if err := client.Init(ctx); err != nil {
		return "", nil, fmt.Errorf("init replica client: %w", err)
	}

	v := litestreamvfs.New(client, logger)
	v.PollInterval = cfg.PollInterval
	v.CacheSize = cfg.CacheSizeBytes
	ncrucesvfs.Register(vfsName, v)

	var once sync.Once
	unregister = func() {
		once.Do(func() {
			ncrucesvfs.Unregister(vfsName)
		})
	}

	dsn = fmt.Sprintf("file:%s?vfs=%s&mode=ro", cfg.DatabaseName, vfsName)
	return dsn, unregister, nil
}

func validateVFSConfig(cfg VFSConfig) error {
	if cfg.ReplicaURL == "" {
		return fmt.Errorf("replica URL is required")
	}
	u, err := url.Parse(cfg.ReplicaURL)
	if err != nil {
		return fmt.Errorf("replica URL is invalid: %w", err)
	}
	if u.Scheme == "" {
		return fmt.Errorf("replica URL scheme is required")
	}
	switch u.Scheme {
	case "file", "s3":
		// supported
	default:
		return fmt.Errorf("unsupported replica URL scheme: %q", u.Scheme)
	}
	if cfg.DatabaseName == "" {
		return fmt.Errorf("database name is required")
	}
	if cfg.PollInterval < 0 {
		return fmt.Errorf("poll interval must not be negative")
	}
	if cfg.CacheSizeBytes <= 0 {
		return fmt.Errorf("cache size must be positive")
	}
	return nil
}
