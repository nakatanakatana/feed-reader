package store

import (
	"database/sql"
	"fmt"
	"strings"

	_ "modernc.org/sqlite"
)

// OpenDB opens a connection to the SQLite database with recommended pragmas enabled.
// It ensures foreign keys are enabled.
func OpenDB(dsn string) (*sql.DB, error) {
	// Check if DSN is ":memory:"
	inMemory := strings.HasPrefix(dsn, ":memory:") || strings.Contains(dsn, "mode=memory")

	separator := "?"
	if strings.Contains(dsn, "?") {
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

	// Add pragmas if they are not already present in DSN.
	// We append them for now; duplicate pragmas in modernc.org/sqlite DSN
	// typically use the last specified value.
	finalDSN := dsn + separator + strings.Join(pragmas, "&")

	db, err := sql.Open("sqlite", finalDSN)
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

	return db, nil
}
