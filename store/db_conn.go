package store

import (
	"database/sql"
	"fmt"
	"strings"
	"sync"

	"github.com/XSAM/otelsql"
	semconv "go.opentelemetry.io/otel/semconv/v1.26.0"
	_ "modernc.org/sqlite"
)

var (
	otelDriverName  string
	otelOnce        sync.Once
	otelRegisterErr error
)

// OpenDB opens a connection to the SQLite database with recommended pragmas enabled.
// It ensures foreign keys are enabled. These settings are appended to the DSN, 
// so they will override any conflicting pragmas already present in the input DSN.
func OpenDB(dsn string) (*sql.DB, error) {
	otelOnce.Do(func() {
		otelDriverName, otelRegisterErr = otelsql.Register("sqlite", otelsql.WithAttributes(semconv.DBSystemSqlite))
	})
	if otelRegisterErr != nil {
		return nil, fmt.Errorf("failed to register otelsql driver: %w", otelRegisterErr)
	}

	// Check if DSN is ":memory:"
	inMemory := strings.HasPrefix(dsn, ":memory:") || strings.Contains(dsn, "mode=memory")

	var separator string
	if !strings.Contains(dsn, "?") {
		separator = "?"
	} else if !strings.HasSuffix(dsn, "?") && !strings.HasSuffix(dsn, "&") {
		separator = "&"
	}

	// Add pragmas
	// foreign_keys=on
	// journal_mode=WAL (good for concurrency, but avoid for in-memory DBs)
	// busy_timeout=5000 (good for concurrency)
	pragmas := []string{
		"_pragma=foreign_keys(1)",
		"_pragma=busy_timeout(5000)",
	}
	if !inMemory {
		pragmas = append(pragmas, "_pragma=journal_mode(WAL)")
	}

	// Append pragmas. We always append them to ensure OpenDB's recommended 
	// settings take precedence over any initial DSN parameters.
	finalDSN := dsn + separator + strings.Join(pragmas, "&")

	db, err := sql.Open(otelDriverName, finalDSN)
	if err != nil {
		return nil, fmt.Errorf("failed to open database: %w", err)
	}

	// Verify foreign keys are actually on.
	// We rely on DSN settings for connection-pool consistency.
	var enabled int
	err = db.QueryRow("PRAGMA foreign_keys").Scan(&enabled)
	if err != nil {
		_ = db.Close()
		return nil, fmt.Errorf("failed to check foreign_keys pragma: %w", err)
	}
	if enabled != 1 {
		_ = db.Close()
		return nil, fmt.Errorf("foreign_keys pragma is not enabled via DSN")
	}

	// Perform foreign key integrity check.
	// PRAGMA foreign_key_check returns rows if there are FK violations.
	rows, err := db.Query("PRAGMA foreign_key_check")
	if err != nil {
		_ = db.Close()
		return nil, fmt.Errorf("failed to run foreign_key_check: %w", err)
	}
	defer func() { _ = rows.Close() }()

	violations, err := collectForeignKeyViolations(rows)
	if err != nil {
		_ = db.Close()
		return nil, err
	}
	if len(violations) > 0 {
		_ = db.Close()
		return nil, fmt.Errorf("foreign key violation: database has unaligned records: %s", strings.Join(violations, "; "))
	}

	return db, nil
}

type foreignKeyCheckRows interface {
	Next() bool
	Scan(...any) error
	Err() error
}

func collectForeignKeyViolations(rows foreignKeyCheckRows) ([]string, error) {
	var violations []string
	for rows.Next() {
		var table, parentTable string
		var rowid int64
		var fkid int
		if err := rows.Scan(&table, &rowid, &parentTable, &fkid); err != nil {
			return nil, fmt.Errorf("failed to scan foreign_key_check result: %w", err)
		}
		violations = append(violations, fmt.Sprintf("table: %s, rowid: %d, parent: %s, fkid: %d", table, rowid, parentTable, fkid))
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("failed to iterate foreign_key_check result: %w", err)
	}
	return violations, nil
}
