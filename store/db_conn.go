package store

import (
	"database/sql"
	"fmt"
	"log/slog"
	"sort"
	"strconv"
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
	violations, err := collectForeignKeyViolations(rows)
	if err != nil {
		_ = rows.Close()
		_ = db.Close()
		return nil, err
	}
	if err := rows.Close(); err != nil {
		_ = db.Close()
		return nil, fmt.Errorf("failed to close foreign_key_check rows: %w", err)
	}
	if len(violations) > 0 {
		records, err := recoverForeignKeyViolations(db, violations)
		if err != nil {
			_ = db.Close()
			return nil, err
		}
		for _, record := range records {
			slog.Warn(
				"deleted record with foreign key violation",
				"table", record.table,
				"rowid", record.rowID,
				"primary_keys", record.primaryKeyValues,
				"foreign_keys", record.foreignKeyValues,
			)
		}
	}

	return db, nil
}

type foreignKeyCheckRows interface {
	Next() bool
	Scan(...any) error
	Err() error
}

func collectForeignKeyViolations(rows foreignKeyCheckRows) ([]foreignKeyViolation, error) {
	var violations []foreignKeyViolation
	for rows.Next() {
		var violation foreignKeyViolation
		if err := rows.Scan(&violation.table, &violation.rowID, &violation.parentTable, &violation.foreignKeyID); err != nil {
			return nil, fmt.Errorf("failed to scan foreign_key_check result: %w", err)
		}
		violations = append(violations, violation)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("failed to iterate foreign_key_check result: %w", err)
	}
	return violations, nil
}

type foreignKeyViolation struct {
	table        string
	rowID        int64
	parentTable  string
	foreignKeyID int
}

type recordIdentifiers struct {
	table            string
	rowID            int64
	primaryKeyValues map[string]any
	foreignKeyValues map[string]any
}

func recoverForeignKeyViolations(db *sql.DB, violations []foreignKeyViolation) (_ []recordIdentifiers, err error) {
	tx, err := db.Begin()
	if err != nil {
		return nil, fmt.Errorf("failed to begin foreign key recovery: %w", err)
	}
	defer func() {
		if err != nil {
			_ = tx.Rollback()
		}
	}()

	grouped := make(map[string][]foreignKeyViolation)
	var keys []string
	for _, violation := range violations {
		key := violation.table + "\x00" + strconv.FormatInt(violation.rowID, 10)
		if _, ok := grouped[key]; !ok {
			keys = append(keys, key)
		}
		grouped[key] = append(grouped[key], violation)
	}

	records := make([]recordIdentifiers, 0, len(keys))
	for _, key := range keys {
		record, readErr := readRecordIdentifiers(tx, grouped[key])
		if readErr != nil {
			return nil, fmt.Errorf("failed to read identifiers for foreign key violation: %w", readErr)
		}
		records = append(records, record)
	}

	for _, key := range keys {
		violation := grouped[key][0]
		query := "DELETE FROM " + quoteSQLiteIdentifier(violation.table) + " WHERE rowid = ?"
		if _, execErr := tx.Exec(query, violation.rowID); execErr != nil {
			return nil, fmt.Errorf("failed to delete foreign key violation: %w", execErr)
		}
	}

	rows, err := tx.Query("PRAGMA foreign_key_check")
	if err != nil {
		return nil, fmt.Errorf("failed to recheck foreign key integrity: %w", err)
	}
	remaining, collectErr := collectForeignKeyViolations(rows)
	closeErr := rows.Close()
	if collectErr != nil {
		return nil, collectErr
	}
	if closeErr != nil {
		return nil, fmt.Errorf("failed to close foreign key recovery check rows: %w", closeErr)
	}
	if len(remaining) > 0 {
		return nil, fmt.Errorf("foreign key violations remain after recovery")
	}
	if err = tx.Commit(); err != nil {
		return nil, fmt.Errorf("failed to commit foreign key recovery: %w", err)
	}
	return records, nil
}

func readRecordIdentifiers(tx *sql.Tx, violations []foreignKeyViolation) (recordIdentifiers, error) {
	first := violations[0]
	primaryKeyColumns, foreignKeyColumns, err := identifierColumns(tx, violations)
	if err != nil {
		return recordIdentifiers{}, err
	}

	record := recordIdentifiers{
		table:            first.table,
		rowID:            first.rowID,
		primaryKeyValues: make(map[string]any),
		foreignKeyValues: make(map[string]any),
	}
	columns := append(append([]string{}, primaryKeyColumns...), foreignKeyColumns...)
	columns = uniqueStrings(columns)
	if len(columns) == 0 {
		return record, nil
	}

	quotedColumns := make([]string, len(columns))
	for i, column := range columns {
		quotedColumns[i] = quoteSQLiteIdentifier(column)
	}
	query := "SELECT " + strings.Join(quotedColumns, ", ") + " FROM " + quoteSQLiteIdentifier(first.table) + " WHERE rowid = ?"
	values := make([]any, len(columns))
	destinations := make([]any, len(columns))
	for i := range values {
		destinations[i] = &values[i]
	}
	if err := tx.QueryRow(query, first.rowID).Scan(destinations...); err != nil {
		return recordIdentifiers{}, err
	}

	for i, column := range columns {
		value := normalizeSQLiteValue(values[i])
		if containsString(primaryKeyColumns, column) {
			record.primaryKeyValues[column] = value
		}
		if containsString(foreignKeyColumns, column) {
			record.foreignKeyValues[column] = value
		}
	}
	return record, nil
}

func identifierColumns(tx *sql.Tx, violations []foreignKeyViolation) ([]string, []string, error) {
	table := violations[0].table
	tableRows, err := tx.Query("PRAGMA table_info(" + quoteSQLiteIdentifier(table) + ")")
	if err != nil {
		return nil, nil, err
	}
	primaryKeyByOrder := make(map[int]string)
	for tableRows.Next() {
		var cid, notNull, primaryKeyOrder int
		var name, columnType string
		var defaultValue any
		if err := tableRows.Scan(&cid, &name, &columnType, &notNull, &defaultValue, &primaryKeyOrder); err != nil {
			_ = tableRows.Close()
			return nil, nil, err
		}
		if primaryKeyOrder > 0 {
			primaryKeyByOrder[primaryKeyOrder] = name
		}
	}
	if err := tableRows.Err(); err != nil {
		_ = tableRows.Close()
		return nil, nil, err
	}
	if err := tableRows.Close(); err != nil {
		return nil, nil, err
	}
	primaryKeyOrders := make([]int, 0, len(primaryKeyByOrder))
	for order := range primaryKeyByOrder {
		primaryKeyOrders = append(primaryKeyOrders, order)
	}
	sort.Ints(primaryKeyOrders)
	primaryKeyColumns := make([]string, 0, len(primaryKeyOrders))
	for _, order := range primaryKeyOrders {
		primaryKeyColumns = append(primaryKeyColumns, primaryKeyByOrder[order])
	}

	foreignKeyIDs := make(map[int]struct{}, len(violations))
	for _, violation := range violations {
		foreignKeyIDs[violation.foreignKeyID] = struct{}{}
	}
	foreignKeyRows, err := tx.Query("PRAGMA foreign_key_list(" + quoteSQLiteIdentifier(table) + ")")
	if err != nil {
		return nil, nil, err
	}
	var foreignKeyColumns []string
	for foreignKeyRows.Next() {
		var id, sequence int
		var parentTable, fromColumn, toColumn, onUpdate, onDelete, match string
		if err := foreignKeyRows.Scan(&id, &sequence, &parentTable, &fromColumn, &toColumn, &onUpdate, &onDelete, &match); err != nil {
			_ = foreignKeyRows.Close()
			return nil, nil, err
		}
		if _, ok := foreignKeyIDs[id]; ok {
			foreignKeyColumns = append(foreignKeyColumns, fromColumn)
		}
	}
	if err := foreignKeyRows.Err(); err != nil {
		_ = foreignKeyRows.Close()
		return nil, nil, err
	}
	if err := foreignKeyRows.Close(); err != nil {
		return nil, nil, err
	}
	return uniqueStrings(primaryKeyColumns), uniqueStrings(foreignKeyColumns), nil
}

func quoteSQLiteIdentifier(identifier string) string {
	return `"` + strings.ReplaceAll(identifier, `"`, `""`) + `"`
}

func normalizeSQLiteValue(value any) any {
	if bytes, ok := value.([]byte); ok {
		return string(bytes)
	}
	return value
}

func uniqueStrings(values []string) []string {
	seen := make(map[string]struct{}, len(values))
	result := make([]string, 0, len(values))
	for _, value := range values {
		if _, ok := seen[value]; ok {
			continue
		}
		seen[value] = struct{}{}
		result = append(result, value)
	}
	return result
}

func containsString(values []string, target string) bool {
	for _, value := range values {
		if value == target {
			return true
		}
	}
	return false
}
