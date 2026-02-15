package schema

import (
	"context"
	"database/sql"
	"fmt"
	"strings"

	"github.com/sqldef/sqldef/v3/database"
	"github.com/sqldef/sqldef/v3/database/sqlite3"
	"github.com/sqldef/sqldef/v3/parser"
	sqlschema "github.com/sqldef/sqldef/v3/schema"
	_ "modernc.org/sqlite"
)

// Migrate performs database migration using sqldef.
// If dryRun is true, it only detects differences and returns an error if any are found.
func Migrate(ctx context.Context, dbPath string, desiredSchema string, dryRun bool) error {
	config := database.Config{
		DbName: dbPath,
	}

	db, err := sqlite3.NewDatabase(config)
	if err != nil {
		return fmt.Errorf("failed to open sqldef database: %w", err)
	}
	defer func() {
		_ = db.Close()
	}()

	sqlParser := database.NewParser(parser.ParserModeSQLite3)

	// Pre-migration: handle table renaming and data migration for Manual Fetch Control
	if !dryRun {
		rawDB, err := sql.Open("sqlite", dbPath)
		if err != nil {
			return fmt.Errorf("failed to open raw sqlite database for pre-migration: %w", err)
		}
		defer func() { _ = rawDB.Close() }()

		tx, err := rawDB.BeginTx(ctx, nil)
		if err != nil {
			return fmt.Errorf("failed to begin pre-migration transaction: %w", err)
		}
		defer func() { _ = tx.Rollback() }()

		// Check if we need to migrate from feed_fetcher_cache to feed_fetcher
		var count int
		if err := tx.QueryRow("SELECT count(*) FROM sqlite_master WHERE type='table' AND name='feed_fetcher_cache'").Scan(&count); err != nil {
			return fmt.Errorf("failed to check existence of feed_fetcher_cache table: %w", err)
		}
		if count > 0 {
			if err := tx.QueryRow("SELECT count(*) FROM sqlite_master WHERE type='table' AND name='feed_fetcher'").Scan(&count); err != nil {
				return fmt.Errorf("failed to check existence of feed_fetcher table: %w", err)
			}
			if count == 0 {
				// Rename table
				if _, err := tx.Exec("ALTER TABLE feed_fetcher_cache RENAME TO feed_fetcher"); err != nil {
					return fmt.Errorf("failed to rename feed_fetcher_cache to feed_fetcher: %w", err)
				}
			}
		}

		// Check if feed_fetcher table exists (either renamed or existed before)
		if err := tx.QueryRow("SELECT count(*) FROM sqlite_master WHERE type='table' AND name='feed_fetcher'").Scan(&count); err != nil {
			return fmt.Errorf("failed to check existence of feed_fetcher table: %w", err)
		}
		if count == 0 {
			// Table doesn't exist yet (clean install), nothing to migrate manually.
			// Commit and return.
			if err := tx.Commit(); err != nil {
				return fmt.Errorf("failed to commit pre-migration transaction: %w", err)
			}
			// Continue to sqldef migration
		} else {
			// Check if we need to move last_fetched_at from feeds to feed_fetcher
			// First, ensure columns exist in feed_fetcher (sqldef will do this, but we need them now for data move)
			if err := tx.QueryRow("SELECT count(*) FROM pragma_table_info('feed_fetcher') WHERE name='last_fetched_at'").Scan(&count); err != nil {
				return fmt.Errorf("failed to check existence of last_fetched_at column: %w", err)
			}
			if count == 0 {
				if _, err := tx.Exec("ALTER TABLE feed_fetcher ADD COLUMN last_fetched_at TEXT"); err != nil {
					return fmt.Errorf("failed to add last_fetched_at column to feed_fetcher: %w", err)
				}
			}

			if err := tx.QueryRow("SELECT count(*) FROM pragma_table_info('feed_fetcher') WHERE name='next_fetch'").Scan(&count); err != nil {
				return fmt.Errorf("failed to check existence of next_fetch column: %w", err)
			}
			if count == 0 {
				if _, err := tx.Exec("ALTER TABLE feed_fetcher ADD COLUMN next_fetch TEXT"); err != nil {
					return fmt.Errorf("failed to add next_fetch column to feed_fetcher: %w", err)
				}
			}

			// Move data
			if _, err := tx.Exec(`
					UPDATE feed_fetcher
					SET last_fetched_at = (SELECT last_fetched_at FROM feeds WHERE feeds.id = feed_fetcher.feed_id)
					WHERE last_fetched_at IS NULL
			`); err != nil {
				return fmt.Errorf("failed to move last_fetched_at data to feed_fetcher: %w", err)
			}
			// Ensure all feeds have a feed_fetcher entry if they don't already
			if _, err := tx.Exec(`
					INSERT OR IGNORE INTO feed_fetcher (feed_id, last_fetched_at, next_fetch)
					SELECT id, last_fetched_at, strftime('%FT%TZ', 'now') FROM feeds
				`); err != nil {
				return fmt.Errorf("failed to ensure feed_fetcher entries for all feeds: %w", err)
			}
			// Also initialize next_fetch for existing feed_fetcher entries if it's null
			if _, err := tx.Exec(`
					UPDATE feed_fetcher SET next_fetch = strftime('%FT%TZ', 'now') WHERE next_fetch IS NULL
				`); err != nil {
				return fmt.Errorf("failed to initialize next_fetch for existing feed_fetcher entries: %w", err)
			}

			if err := tx.Commit(); err != nil {
				return fmt.Errorf("failed to commit pre-migration transaction: %w", err)
			}
		}
	}

	currentDDLs, err := db.ExportDDLs()
	if err != nil {
		return fmt.Errorf("failed to export current DDLs: %w", err)
	}

	generatorConfig := database.GeneratorConfig{}

	ddls, err := sqlschema.GenerateIdempotentDDLs(sqlschema.GeneratorModeSQLite3, sqlParser, desiredSchema, currentDDLs, generatorConfig, "")
	if err != nil {
		return fmt.Errorf("failed to generate idempotent DDLs: %w", err)
	}

	if len(ddls) == 0 {
		return nil
	}

	if dryRun {
		var sb strings.Builder
		sb.WriteString("database schema is out of sync:\n")
		for _, ddl := range ddls {
			sb.WriteString(ddl)
			sb.WriteString(";\n")
		}
		return fmt.Errorf("%s", sb.String())
	}

	// Actually apply DDLs
	err = database.RunDDLs(db, ddls, "", "", database.StdoutLogger{})
	if err != nil {
		return fmt.Errorf("failed to run DDLs: %w", err)
	}

	return nil
}
