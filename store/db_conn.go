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
	// Ensure DSN has the necessary pragmas
	// If the DSN is just a file path, we append the query parameters.
	// If it already has query parameters, we append to them.
	
	// Check if DSN is ":memory:"
	if dsn == ":memory:" {
		// For in-memory DB, we also want FKs.
		// modernc.org/sqlite supports query params for :memory: too? Yes.
	}

	separator := "?"
	if strings.Contains(dsn, "?") {
		separator = "&"
	}

	// Add pragmas
	// foreign_keys=on
	// journal_mode=WAL (good for concurrency)
	// busy_timeout=5000 (good for concurrency)
	pragmas := []string{
		"_pragma=foreign_keys(1)",
		"_pragma=journal_mode(WAL)",
		"_pragma=busy_timeout(5000)",
	}

	// Only add pragmas if they are not already present (simple check)
	// But duplicate pragmas are usually fine or the user might override.
	// Let's force them for now as per requirement.
	
	finalDSN := dsn + separator + strings.Join(pragmas, "&")

	db, err := sql.Open("sqlite", finalDSN)
	if err != nil {
		return nil, fmt.Errorf("failed to open database: %w", err)
	}

	// Verify foreign keys are actually on
	var enabled int
	err = db.QueryRow("PRAGMA foreign_keys").Scan(&enabled)
	if err != nil {
		db.Close()
		return nil, fmt.Errorf("failed to check foreign_keys pragma: %w", err)
	}
	if enabled != 1 {
		// Try enabling explicitly if DSN didn't work (though it should)
		_, err = db.Exec("PRAGMA foreign_keys = ON")
		if err != nil {
			db.Close()
			return nil, fmt.Errorf("failed to enable foreign_keys: %w", err)
		}
		
		// Re-check
		err = db.QueryRow("PRAGMA foreign_keys").Scan(&enabled)
		if err != nil {
			db.Close()
			return nil, fmt.Errorf("failed to re-check foreign_keys pragma: %w", err)
		}
		if enabled != 1 {
			db.Close()
			return nil, fmt.Errorf("foreign_keys pragma could not be enabled")
		}
	}

	return db, nil
}
