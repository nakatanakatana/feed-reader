package telemetry

import (
	"context"
	"database/sql/driver"
	"strings"

	"github.com/XSAM/otelsql"
	"go.opentelemetry.io/otel/attribute"
	semconv "go.opentelemetry.io/otel/semconv/v1.43.0"
)

// SQLQuerySummary extracts the sqlc query name from a leading "-- name: <Name> :<cmd>" comment.
// It returns an empty string when the query has no sqlc name comment.
func SQLQuerySummary(query string) string {
	firstLine, _, _ := strings.Cut(strings.TrimSpace(query), "\n")
	rest, ok := strings.CutPrefix(strings.TrimSpace(firstLine), "-- name:")
	if !ok {
		return ""
	}
	fields := strings.Fields(rest)
	if len(fields) == 0 {
		return ""
	}
	return fields[0]
}

// SQLiteOTelOptions returns the standard otelsql options for SQLite instrumentation:
// db.system.name=sqlite, sqlc-derived db.query.summary (omitted when absent), and
// span naming using the sqlc query name when available.
func SQLiteOTelOptions() []otelsql.Option {
	return []otelsql.Option{
		otelsql.WithAttributes(semconv.DBSystemNameSQLite),
		otelsql.WithAttributesGetter(func(_ context.Context, _ otelsql.Method, query string, _ []driver.NamedValue) []attribute.KeyValue {
			summary := SQLQuerySummary(query)
			if summary == "" {
				return nil
			}
			return []attribute.KeyValue{semconv.DBQuerySummary(summary)}
		}),
		otelsql.WithSpanNameFormatter(func(_ context.Context, method otelsql.Method, query string) string {
			if summary := SQLQuerySummary(query); summary != "" {
				return summary
			}
			return string(method)
		}),
		otelsql.WithSpanOptions(otelsql.SpanOptions{
			DisableErrSkip:       true,
			OmitConnResetSession: true,
		}),
	}
}
