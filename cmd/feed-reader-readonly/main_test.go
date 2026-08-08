package main

import (
	"bytes"
	"context"
	"database/sql"
	"io/fs"
	"log/slog"
	"net"
	"net/http"
	"net/http/httptest"
	"os"
	"runtime"
	"strings"
	"testing"
	"testing/fstest"
	"time"

	"github.com/caarlos0/env/v11"
	"github.com/nakatanakatana/feed-reader/internal/primarydb"
	"github.com/nakatanakatana/feed-reader/internal/readonly"
	"github.com/nakatanakatana/feed-reader/internal/readonlydb"
	schema "github.com/nakatanakatana/feed-reader/sql"
	"gotest.tools/v3/assert"
	"gotest.tools/v3/assert/cmp"
)

func TestConfig_Parse(t *testing.T) {
	envKeys := []string{
		"PORT",
		"LITESTREAM_REPLICA_URL",
		"LITESTREAM_DATABASE_NAME",
		"LITESTREAM_POLL_INTERVAL",
		"LITESTREAM_CACHE_SIZE_BYTES",
		"LITESTREAM_MAX_OPEN_CONNECTIONS",
		"CORS_ALLOWED_ORIGINS",
	}
	clearEnv := func() {
		for _, k := range envKeys {
			_ = os.Unsetenv(k)
		}
	}
	t.Cleanup(clearEnv)

	tests := []struct {
		name string
		envs map[string]string
		want config
	}{
		{
			name: "defaults for poll, cache size, and max open connections",
			envs: map[string]string{},
			want: config{
				Port:               "8080",
				PollInterval:       time.Second,
				CacheSizeBytes:     10 * 1024 * 1024,
				MaxOpenConnections: 4,
			},
		},
		{
			name: "custom readonly VFS values",
			envs: map[string]string{
				"PORT":                            "9090",
				"LITESTREAM_REPLICA_URL":          "file:///tmp/replica",
				"LITESTREAM_DATABASE_NAME":        "feeds.db",
				"LITESTREAM_POLL_INTERVAL":        "500ms",
				"LITESTREAM_CACHE_SIZE_BYTES":     "2097152",
				"LITESTREAM_MAX_OPEN_CONNECTIONS": "8",
				"CORS_ALLOWED_ORIGINS":            "http://localhost:3000,https://example.com",
			},
			want: config{
				Port:               "9090",
				ReplicaURL:         "file:///tmp/replica",
				DatabaseName:       "feeds.db",
				PollInterval:       500 * time.Millisecond,
				CacheSizeBytes:     2 * 1024 * 1024,
				MaxOpenConnections: 8,
				CORSAllowedOrigins: []string{"http://localhost:3000", "https://example.com"},
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			clearEnv()
			for k, v := range tt.envs {
				assert.NilError(t, os.Setenv(k, v))
			}

			var cfg config
			assert.NilError(t, env.Parse(&cfg))
			assert.Assert(t, cmp.DeepEqual(cfg, tt.want))
		})
	}
}

func TestNewMux(t *testing.T) {
	db := setupQueryableDB(t)
	assets := fstest.MapFS{
		"index.html": &fstest.MapFile{Data: []byte("ok")},
	}

	// Constructor may only wire Store, Assets, AllowedOrigins, and AllowedMethods.
	handler := newMux(db, assets, nil)

	t.Run("GET /api/v2/feeds delegates to OpenAPI handler", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/v2/feeds", nil)
		rec := httptest.NewRecorder()
		handler.ServeHTTP(rec, req)
		assert.Equal(t, rec.Code, http.StatusOK, rec.Body.String())
	})

	t.Run("POST /api/v2/feeds is 405", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodPost, "/api/v2/feeds", nil)
		rec := httptest.NewRecorder()
		handler.ServeHTTP(rec, req)
		assert.Equal(t, rec.Code, http.StatusMethodNotAllowed, rec.Body.String())
		assert.Equal(t, rec.Header().Get("Allow"), "GET, HEAD, OPTIONS")
	})

	t.Run("GET /readyz returns 200 against queryable DB", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/readyz", nil)
		rec := httptest.NewRecorder()
		handler.ServeHTTP(rec, req)
		assert.Equal(t, rec.Code, http.StatusOK, rec.Body.String())
	})

	t.Run("POST /healthz is 405", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodPost, "/healthz", nil)
		rec := httptest.NewRecorder()
		handler.ServeHTTP(rec, req)
		assert.Equal(t, rec.Code, http.StatusMethodNotAllowed, rec.Body.String())
	})

	t.Run("POST /readyz is 405", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodPost, "/readyz", nil)
		rec := httptest.NewRecorder()
		handler.ServeHTTP(rec, req)
		assert.Equal(t, rec.Code, http.StatusMethodNotAllowed, rec.Body.String())
	})

	t.Run("POST /index.html is 405", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodPost, "/index.html", nil)
		rec := httptest.NewRecorder()
		handler.ServeHTTP(rec, req)
		assert.Equal(t, rec.Code, http.StatusMethodNotAllowed, rec.Body.String())
	})
}

func TestNewMux_ConstructorLimitedToDBAndAssets(t *testing.T) {
	// Compile-time / API-level proof: newMux accepts only *sql.DB, assets, and origins.
	// It must not take scheduler, fetcher, write-queue, or migration dependencies.
	assertNewMuxSignature(newMux)
	db := setupQueryableDB(t)
	handler := newMux(db, fstest.MapFS{"index.html": &fstest.MapFile{Data: []byte("ok")}}, nil)
	assert.Assert(t, handler != nil)
}

func assertNewMuxSignature(_ func(*sql.DB, fs.FS, []string) http.Handler) {}

func setupQueryableDB(t *testing.T) *sql.DB {
	t.Helper()
	db, err := primarydb.OpenDB(":memory:")
	assert.NilError(t, err)
	db.SetMaxOpenConns(1)
	_, err = db.Exec(schema.Schema)
	assert.NilError(t, err)
	t.Cleanup(func() {
		assert.NilError(t, db.Close())
	})
	return db
}

func TestMain_OrderlyCleanupOnServerError(t *testing.T) {
	// 1. すでに使用中のポートを確保する
	l, err := net.Listen("tcp", "127.0.0.1:0")
	assert.NilError(t, err)
	defer l.Close()
	_, port, err := net.SplitHostPort(l.Addr().String())
	assert.NilError(t, err)

	os.Setenv("PORT", port)
	os.Setenv("LITESTREAM_REPLICA_URL", "file:///tmp/dummy")
	os.Setenv("LITESTREAM_DATABASE_NAME", "dummy.db")
	defer func() {
		os.Unsetenv("PORT")
		os.Unsetenv("LITESTREAM_REPLICA_URL")
		os.Unsetenv("LITESTREAM_DATABASE_NAME")
	}()

	// Context Injection モック
	testCtx, mainCancel := context.WithCancel(context.Background())
	mainCtx = testCtx
	defer func() {
		mainCtx = context.Background()
		mainCancel()
	}()

	// 2. RegisterVFS と OpenReadOnlyDB をモックする
	var unregisterCalled bool
	registerVFS = func(ctx context.Context, cfg readonly.VFSConfig, logger *slog.Logger) (string, func(), error) {
		return "file::memory:?mode=memory&cache=shared", func() {
			unregisterCalled = true
		}, nil
	}
	defer func() {
		registerVFS = readonly.RegisterVFS
	}()

	var targetDB *sql.DB
	openReadOnlyDB = func(dsn string, maxOpenConns int) (*sql.DB, error) {
		db, err := primarydb.OpenDB(":memory:")
		if err != nil {
			return nil, err
		}
		_, err = db.Exec(schema.Schema)
		if err != nil {
			db.Close()
			return nil, err
		}
		targetDB = db
		return db, nil
	}
	defer func() {
		openReadOnlyDB = readonlydb.OpenReadOnlyDB
	}()

	// 3. osExit をモックする
	var exitCode int
	var exitCalled bool
	var exitCalledBeforeCleanup bool
	osExit = func(code int) {
		exitCode = code
		exitCalled = true
		if !unregisterCalled {
			exitCalledBeforeCleanup = true
		}
		mainCancel()
		// runtime.Goexit を呼んでこの goroutine を自殺させる
		// （メイン goroutine で呼ばれたときもテスト自体は続行される）
		// ただし、テストを中断するために `testing` パッケージが動くので runtime.Goexit が安全
		runtime.Goexit()
	}
	defer func() {
		osExit = os.Exit
	}()

	// 4. logger をモックしてログをキャプチャする
	var logBuf bytes.Buffer
	testLogger := slog.New(slog.NewJSONHandler(&logBuf, nil))
	createLogger = func() *slog.Logger {
		return testLogger
	}
	defer func() {
		createLogger = func() *slog.Logger {
			return slog.New(slog.NewJSONHandler(os.Stdout, nil))
		}
	}()

	// 5. main() を実行する
	// テストを実行している goroutine とは別に main を動かすと、main 内の osExit (Goexit) で終了できる
	// が、直接 main() を実行しても、defer ブロックが panic なしで実行される
	var mainFinished bool
	go func() {
		main()
		mainFinished = true
	}()

	// しばらく待つか、または osExit が呼ばれるのを待つ
	// 500ms タイムアウトを設ける
	deadline := time.After(500 * time.Millisecond)
	ticker := time.NewTicker(5 * time.Millisecond)
	defer ticker.Stop()

waitLoop:
	for {
		select {
		case <-deadline:
			t.Fatal("timeout waiting for main to exit or fail")
		case <-ticker.C:
			if exitCalled || mainFinished {
				break waitLoop
			}
		}
	}

	// 6. アサーション
	assert.Equal(t, exitCode, 1)
	assert.Assert(t, exitCalled, "expected osExit to be called")
	assert.Assert(t, !exitCalledBeforeCleanup, "expected cleanup to occur before osExit is called")
	assert.Assert(t, unregisterCalled, "expected unregister to be called")

	// DBがクローズされていることを検証
	if targetDB != nil {
		err := targetDB.Ping()
		assert.Assert(t, err != nil, "expected DB to be closed, but Ping succeeded")
	}

	// クリーンアップが行われたことを示すログが出力されているか？
	logOutput := logBuf.String()
	assert.Assert(t, strings.Contains(logOutput, "shutdown complete"), "expected 'shutdown complete' log in output: %s", logOutput)
}
