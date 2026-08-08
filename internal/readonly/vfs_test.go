package readonly_test

import (
	"bytes"
	"context"
	"database/sql"
	"io"
	"log/slog"
	"os"
	"path/filepath"
	"testing"
	"time"

	"github.com/benbjohnson/litestream/file"
	"github.com/nakatanakatana/feed-reader/internal/readonly"
	"github.com/nakatanakatana/feed-reader/internal/readonlydb"
	ncrucesvfs "github.com/ncruces/go-sqlite3/vfs"
	"github.com/stretchr/testify/require"
	"github.com/superfly/ltx"
	_ "modernc.org/sqlite"
)

const (
	vfsName      = "feed-reader-litestream"
	testPageSize = 4096
	seededTitle  = "Seed Feed"
	updatedTitle = "Updated Feed"
	databaseName = "feeds.db"
)

func TestVFSConfig(t *testing.T) {
	ctx := context.Background()
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	tempReplica := t.TempDir()

	tests := []struct {
		name    string
		cfg     readonly.VFSConfig
		wantErr string
		wantDSN string
	}{
		{
			name: "empty URL",
			cfg: readonly.VFSConfig{
				ReplicaURL:     "",
				DatabaseName:   databaseName,
				PollInterval:   time.Second,
				CacheSizeBytes: 1024 * 1024,
			},
			wantErr: "replica URL",
		},
		{
			name: "invalid URL",
			cfg: readonly.VFSConfig{
				ReplicaURL:     "://bad",
				DatabaseName:   databaseName,
				PollInterval:   time.Second,
				CacheSizeBytes: 1024 * 1024,
			},
			wantErr: "replica URL",
		},
		{
			name: "missing database name",
			cfg: readonly.VFSConfig{
				ReplicaURL:     "file://" + tempReplica,
				DatabaseName:   "",
				PollInterval:   time.Second,
				CacheSizeBytes: 1024 * 1024,
			},
			wantErr: "database name",
		},
		{
			name: "zero poll interval",
			cfg: readonly.VFSConfig{
				ReplicaURL:     "file://" + tempReplica,
				DatabaseName:   databaseName,
				PollInterval:   0,
				CacheSizeBytes: 1024 * 1024,
			},
			wantErr: "poll interval",
		},
		{
			name: "negative poll interval",
			cfg: readonly.VFSConfig{
				ReplicaURL:     "file://" + tempReplica,
				DatabaseName:   databaseName,
				PollInterval:   -time.Millisecond,
				CacheSizeBytes: 1024 * 1024,
			},
			wantErr: "poll interval",
		},
		{
			name: "database name with question mark",
			cfg: readonly.VFSConfig{
				ReplicaURL:     "file://" + tempReplica,
				DatabaseName:   "feeds.db?vfs=override",
				PollInterval:   time.Second,
				CacheSizeBytes: 1024 * 1024,
			},
			wantErr: "database name contains unsafe characters",
		},
		{
			name: "database name with ampersand",
			cfg: readonly.VFSConfig{
				ReplicaURL:     "file://" + tempReplica,
				DatabaseName:   "feeds.db&mode=rw",
				PollInterval:   time.Second,
				CacheSizeBytes: 1024 * 1024,
			},
			wantErr: "database name contains unsafe characters",
		},
		{
			name: "database name with hash",
			cfg: readonly.VFSConfig{
				ReplicaURL:     "file://" + tempReplica,
				DatabaseName:   "feeds.db#fragment",
				PollInterval:   time.Second,
				CacheSizeBytes: 1024 * 1024,
			},
			wantErr: "database name contains unsafe characters",
		},
		{
			name: "non-positive cache size",
			cfg: readonly.VFSConfig{
				ReplicaURL:     "file://" + tempReplica,
				DatabaseName:   databaseName,
				PollInterval:   time.Second,
				CacheSizeBytes: 0,
			},
			wantErr: "cache size",
		},
		{
			name: "unsupported gs scheme",
			cfg: readonly.VFSConfig{
				ReplicaURL:     "gs://bucket/path",
				DatabaseName:   databaseName,
				PollInterval:   time.Second,
				CacheSizeBytes: 1024 * 1024,
			},
			wantErr: "unsupported",
		},
		{
			name: "valid file URL",
			cfg: readonly.VFSConfig{
				ReplicaURL:     "file://" + tempReplica,
				DatabaseName:   databaseName,
				PollInterval:   time.Second,
				CacheSizeBytes: 1024 * 1024,
			},
			wantDSN: "file:feeds.db?vfs=feed-reader-litestream&mode=ro",
		},
		{
			name: "valid s3 URL",
			cfg: readonly.VFSConfig{
				ReplicaURL:     "s3://test-bucket/replica?region=us-east-1&endpoint=http://127.0.0.1:9",
				DatabaseName:   databaseName,
				PollInterval:   time.Second,
				CacheSizeBytes: 1024 * 1024,
			},
			wantDSN: "file:feeds.db?vfs=feed-reader-litestream&mode=ro",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			dsn, unregister, err := readonly.RegisterVFS(ctx, tt.cfg, logger)
			if tt.wantErr != "" {
				require.Error(t, err)
				require.ErrorContains(t, err, tt.wantErr)
				require.Nil(t, unregister)
				require.Empty(t, dsn)
				return
			}
			require.NoError(t, err)
			require.Equal(t, tt.wantDSN, dsn)
			require.NotNil(t, unregister)
			require.NotNil(t, ncrucesvfs.Find(vfsName))
			unregister()
			unregister() // idempotent
			require.Nil(t, ncrucesvfs.Find(vfsName))
		})
	}
}

func TestRegisterVFS(t *testing.T) {
	ctx := context.Background()
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	replicaPath := t.TempDir()
	writeFeedsReplica(t, replicaPath, seededTitle)

	dsn, unregister, err := readonly.RegisterVFS(ctx, readonly.VFSConfig{
		ReplicaURL:     "file://" + replicaPath,
		DatabaseName:   databaseName,
		PollInterval:   50 * time.Millisecond,
		CacheSizeBytes: 1024 * 1024,
	}, logger)
	require.NoError(t, err)
	require.Equal(t, "file:feeds.db?vfs=feed-reader-litestream&mode=ro", dsn)
	require.NotNil(t, ncrucesvfs.Find(vfsName))

	db, err := readonlydb.OpenReadOnlyDB(dsn, 1)
	require.NoError(t, err)

	var title string
	err = db.QueryRowContext(ctx, `SELECT title FROM feeds`).Scan(&title)
	require.NoError(t, err)
	require.Equal(t, seededTitle, title)

	require.NoError(t, db.Close())
	unregister()
	require.Nil(t, ncrucesvfs.Find(vfsName))
}

func TestVFSFollowsLatest(t *testing.T) {
	ctx := context.Background()
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	replicaPath := t.TempDir()

	before := sqlitePagesFromDDL(t, `
		CREATE TABLE feeds (title TEXT);
		INSERT INTO feeds (title) VALUES ('`+seededTitle+`');
	`)
	writePagesAsLTX(t, replicaPath, 1, before)

	dsn, unregister, err := readonly.RegisterVFS(ctx, readonly.VFSConfig{
		ReplicaURL:     "file://" + replicaPath,
		DatabaseName:   databaseName,
		PollInterval:   20 * time.Millisecond,
		CacheSizeBytes: 1024 * 1024,
	}, logger)
	require.NoError(t, err)
	defer unregister()

	db, err := readonlydb.OpenReadOnlyDB(dsn, 1)
	require.NoError(t, err)

	var title string
	err = db.QueryRowContext(ctx, `SELECT title FROM feeds`).Scan(&title)
	require.NoError(t, err)
	require.Equal(t, seededTitle, title)

	after := sqlitePagesAfterSQL(t, before, `UPDATE feeds SET title = '`+updatedTitle+`'`)
	diff, _ := sqliteLTXDiff(t, 2, before, after)
	publishLTX(t, replicaPath, 2, 2, diff)

	require.Eventually(t, func() bool {
		var got string
		qErr := db.QueryRowContext(ctx, `SELECT title FROM feeds`).Scan(&got)
		return qErr == nil && got == updatedTitle
	}, 2*time.Second, 20*time.Millisecond)

	require.NoError(t, db.Close())
	unregister()
	require.Nil(t, ncrucesvfs.Find(vfsName))
}

func writeFeedsReplica(t *testing.T, replicaPath, title string) {
	t.Helper()
	pages := sqlitePagesFromDDL(t, `
		CREATE TABLE feeds (title TEXT);
		INSERT INTO feeds (title) VALUES ('`+title+`');
	`)
	writePagesAsLTX(t, replicaPath, 1, pages)
}

func writePagesAsLTX(t *testing.T, replicaPath string, txid ltx.TXID, pages map[uint32][]byte) {
	t.Helper()
	data, info := encodeTestLTX(t, txid, pages)
	publishLTX(t, replicaPath, info.MinTXID, info.MaxTXID, data)
}

func publishLTX(t *testing.T, replicaPath string, minTXID, maxTXID ltx.TXID, data []byte) {
	t.Helper()
	client := file.NewReplicaClient(replicaPath)
	require.NoError(t, client.Init(context.Background()))
	_, err := client.WriteLTXFile(context.Background(), 0, minTXID, maxTXID, bytes.NewReader(data))
	require.NoError(t, err)
}

func sqlitePagesFromDDL(t *testing.T, ddl string) map[uint32][]byte {
	t.Helper()
	dir := t.TempDir()
	path := filepath.Join(dir, "source.db")
	db, err := sql.Open("sqlite", path)
	require.NoError(t, err)
	_, err = db.Exec(ddl)
	require.NoError(t, err)
	_, err = db.Exec(`PRAGMA journal_mode=DELETE;`)
	require.NoError(t, err)
	require.NoError(t, db.Close())
	return sqlitePagesFromFile(t, path)
}

func sqlitePagesAfterSQL(t *testing.T, pages map[uint32][]byte, sqlStmt string) map[uint32][]byte {
	t.Helper()
	require.NotEmpty(t, pages)
	dir := t.TempDir()
	path := filepath.Join(dir, "mutate.db")
	require.NoError(t, os.WriteFile(path, pagesToBytes(t, pages), 0o644))
	db, err := sql.Open("sqlite", path)
	require.NoError(t, err)
	_, err = db.Exec(sqlStmt)
	require.NoError(t, err)
	require.NoError(t, db.Close())
	return sqlitePagesFromFile(t, path)
}

func sqliteLTXDiff(t *testing.T, txid ltx.TXID, before, after map[uint32][]byte) ([]byte, *ltx.FileInfo) {
	t.Helper()
	require.NotEmpty(t, after)
	changed := make(map[uint32][]byte)
	for pgno, afterPage := range after {
		beforePage, ok := before[pgno]
		if !ok || !bytes.Equal(beforePage, afterPage) {
			page := make([]byte, len(afterPage))
			copy(page, afterPage)
			changed[pgno] = page
		}
	}
	require.NotEmpty(t, changed)
	commit := uint32(len(after))
	if max := maxPageNumber(after); max > commit {
		commit = max
	}
	return encodeTestLTXRange(t, 0, txid, txid, commit, changed)
}

func sqlitePagesFromFile(t *testing.T, path string) map[uint32][]byte {
	t.Helper()
	raw, err := os.ReadFile(path)
	require.NoError(t, err)
	require.GreaterOrEqual(t, len(raw), testPageSize)
	require.Equal(t, 0, len(raw)%testPageSize)
	pages := make(map[uint32][]byte)
	pageCount := uint32(len(raw) / testPageSize)
	for i := uint32(0); i < pageCount; i++ {
		pgno := i + 1
		start := int(i) * testPageSize
		page := make([]byte, testPageSize)
		copy(page, raw[start:start+testPageSize])
		pages[pgno] = page
	}
	return pages
}

func pagesToBytes(t *testing.T, pages map[uint32][]byte) []byte {
	t.Helper()
	n := maxPageNumber(pages)
	require.Positive(t, n)
	raw := make([]byte, int(n)*testPageSize)
	for pgno, page := range pages {
		require.Equal(t, testPageSize, len(page))
		copy(raw[int(pgno-1)*testPageSize:], page)
	}
	return raw
}

func encodeTestLTX(t *testing.T, txid ltx.TXID, pages map[uint32][]byte) ([]byte, *ltx.FileInfo) {
	t.Helper()
	return encodeTestLTXRange(t, 0, txid, txid, maxPageNumber(pages), pages)
}

func encodeTestLTXRange(t *testing.T, level int, minTXID, maxTXID ltx.TXID, commit uint32, pages map[uint32][]byte) ([]byte, *ltx.FileInfo) {
	t.Helper()
	require.NotEmpty(t, pages)
	pgnos := make([]uint32, 0, len(pages))
	for pgno := range pages {
		pgnos = append(pgnos, pgno)
	}
	for i := 0; i < len(pgnos); i++ {
		for j := i + 1; j < len(pgnos); j++ {
			if pgnos[j] < pgnos[i] {
				pgnos[i], pgnos[j] = pgnos[j], pgnos[i]
			}
		}
	}
	var buf bytes.Buffer
	enc, err := ltx.NewEncoder(&buf)
	require.NoError(t, err)
	hdr := ltx.Header{
		Version:   ltx.Version,
		PageSize:  testPageSize,
		Commit:    commit,
		MinTXID:   minTXID,
		MaxTXID:   maxTXID,
		Timestamp: time.Now().UnixMilli(),
		Flags:     ltx.HeaderFlagNoChecksum,
	}
	require.NoError(t, enc.EncodeHeader(hdr))
	for _, pgno := range pgnos {
		page := make([]byte, testPageSize)
		copy(page, pages[pgno])
		require.NoError(t, enc.EncodePage(ltx.PageHeader{Pgno: pgno}, page))
	}
	require.NoError(t, enc.Close())
	info := &ltx.FileInfo{
		Level:     level,
		MinTXID:   minTXID,
		MaxTXID:   maxTXID,
		Size:      int64(buf.Len()),
		CreatedAt: time.Now().UTC(),
	}
	return buf.Bytes(), info
}

func maxPageNumber(pages map[uint32][]byte) uint32 {
	var max uint32
	for pgno := range pages {
		if pgno > max {
			max = pgno
		}
	}
	return max
}
