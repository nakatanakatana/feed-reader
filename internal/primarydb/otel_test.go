package primarydb_test

import (
	"context"
	"strings"
	"testing"

	"github.com/nakatanakatana/feed-reader/internal/primarydb"
	"go.opentelemetry.io/otel"
	sdktrace "go.opentelemetry.io/otel/sdk/trace"
	"go.opentelemetry.io/otel/sdk/trace/tracetest"
	"gotest.tools/v3/assert"
)

func TestOpenDB_SQLiteTracingRecordsSystemPlaceholderSQLAndPropagatesContext(t *testing.T) {
	oldTP := otel.GetTracerProvider()
	exporter := tracetest.NewInMemoryExporter()
	tp := sdktrace.NewTracerProvider(sdktrace.WithSyncer(exporter))
	otel.SetTracerProvider(tp)
	t.Cleanup(func() {
		otel.SetTracerProvider(oldTP)
		_ = tp.Shutdown(context.Background())
	})

	db, err := primarydb.OpenDBContext(t.Context(), ":memory:")
	assert.NilError(t, err)
	t.Cleanup(func() { _ = db.Close() })

	_, err = db.ExecContext(t.Context(), "CREATE TABLE secrets (id TEXT PRIMARY KEY, token TEXT)")
	assert.NilError(t, err)

	exporter.Reset()

	parentCtx, parentSpan := tp.Tracer("test").Start(t.Context(), "db-workflow")
	secretValue := "super-secret-bind-value-99999"

	tx, err := db.BeginTx(parentCtx, nil)
	assert.NilError(t, err)
	_, err = tx.ExecContext(parentCtx, "INSERT INTO secrets (id, token) VALUES (?, ?)", "row-1", secretValue)
	assert.NilError(t, err)
	assert.NilError(t, tx.Commit())

	var got string
	err = db.QueryRowContext(parentCtx, "SELECT token FROM secrets WHERE id = ?", "row-1").Scan(&got)
	assert.NilError(t, err)
	assert.Equal(t, got, secretValue)

	parentSpan.End()

	spans := exporter.GetSpans()
	var foundInsert, foundSelect bool
	for _, s := range spans {
		if s.SpanContext.SpanID() == parentSpan.SpanContext().SpanID() {
			continue
		}
		// Every DB child span must inherit the parent trace and span
		if s.SpanContext.TraceID() != parentSpan.SpanContext().TraceID() {
			continue
		}

		attrs := make(map[string]string)
		for _, kv := range s.Attributes {
			val := kv.Value.String()
			attrs[string(kv.Key)] = val
			assert.Assert(t, !strings.Contains(val, secretValue), "raw bind value must not appear in span attribute %s: %s", kv.Key, val)
		}

		dbSystem := attrs["db.system.name"]
		if dbSystem == "" {
			dbSystem = attrs["db.system"]
		}
		assert.Equal(t, dbSystem, "sqlite")

		stmt := attrs["db.query.text"]
		if stmt == "" {
			stmt = attrs["db.statement"]
		}
		if strings.Contains(stmt, "INSERT INTO secrets (id, token) VALUES (?, ?)") {
			foundInsert = true
			assert.Equal(t, s.Parent.SpanID(), parentSpan.SpanContext().SpanID())
		}
		if strings.Contains(stmt, "SELECT token FROM secrets WHERE id = ?") {
			foundSelect = true
			assert.Equal(t, s.Parent.SpanID(), parentSpan.SpanContext().SpanID())
		}
	}

	assert.Assert(t, foundInsert, "expected INSERT span with placeholder SQL")
	assert.Assert(t, foundSelect, "expected SELECT span with placeholder SQL")
}
