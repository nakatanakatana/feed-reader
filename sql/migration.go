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
		if err == nil {
			defer rawDB.Close()

			// Check if we need to migrate from feed_fetcher_cache to feed_fetcher
			var count int
			_ = rawDB.QueryRow("SELECT count(*) FROM sqlite_master WHERE type='table' AND name='feed_fetcher_cache'").Scan(&count)
			if count > 0 {
				_ = rawDB.QueryRow("SELECT count(*) FROM sqlite_master WHERE type='table' AND name='feed_fetcher'").Scan(&count)
				if count == 0 {
					// Rename table
					_, _ = rawDB.Exec("ALTER TABLE feed_fetcher_cache RENAME TO feed_fetcher")
				}
			}

			// Check if we need to move last_fetched_at from feeds to feed_fetcher
			// First, ensure columns exist in feed_fetcher (sqldef will do this, but we need them now for data move)
			_, _ = rawDB.Exec("ALTER TABLE feed_fetcher ADD COLUMN last_fetched_at TEXT")
			_, _ = rawDB.Exec("ALTER TABLE feed_fetcher ADD COLUMN next_fetch TEXT")

			// Move data
			_, _ = rawDB.Exec(`
				UPDATE feed_fetcher
				SET last_fetched_at = (SELECT last_fetched_at FROM feeds WHERE feeds.id = feed_fetcher.feed_id)
				WHERE last_fetched_at IS NULL
			`)
			// Ensure all feeds have a feed_fetcher entry if they don't already
			_, _ = rawDB.Exec(`
				INSERT OR IGNORE INTO feed_fetcher (feed_id, last_fetched_at, next_fetch)
				SELECT id, last_fetched_at, strftime('%FT%TZ', 'now') FROM feeds
			`)
			// Also initialize next_fetch for existing feed_fetcher entries if it's null
			_, _ = rawDB.Exec(`
				UPDATE feed_fetcher SET next_fetch = strftime('%FT%TZ', 'now') WHERE next_fetch IS NULL
			`)
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
