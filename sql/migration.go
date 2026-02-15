package schema

import (
	"context"
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
