package readonlydb_test

import (
	"context"
	"path/filepath"
	"strings"
	"testing"

	"github.com/nakatanakatana/feed-reader/internal/primarydb"
	"github.com/nakatanakatana/feed-reader/internal/readonlydb"
	"go.opentelemetry.io/otel"
	sdktrace "go.opentelemetry.io/otel/sdk/trace"
	"go.opentelemetry.io/otel/sdk/trace/tracetest"
	"gotest.tools/v3/assert"
)

func TestOpenReadOnlyDB_SQLiteTracingRecordsSystemPlaceholderSQLAndPropagatesContext(t *testing.T) {
	dbPath := filepath.Join(t.TempDir(), "readonly-trace.db")
	wdb, err := primarydb.OpenDBContext(t.Context(), dbPath)
	assert.NilError(t, err)
	_, err = wdb.ExecContext(t.Context(), "CREATE TABLE items (id TEXT PRIMARY KEY, secret TEXT)")
	assert.NilError(t, err)
	secretValue := "readonly-secret-bind-value-777"
	_, err = wdb.ExecContext(t.Context(), "INSERT INTO items (id, secret) VALUES (?, ?)", "item-1", secretValue)
	assert.NilError(t, err)
	assert.NilError(t, wdb.Close())

	oldTP := otel.GetTracerProvider()
	exporter := tracetest.NewInMemoryExporter()
	tp := sdktrace.NewTracerProvider(sdktrace.WithSyncer(exporter))
	otel.SetTracerProvider(tp)
	t.Cleanup(func() {
		otel.SetTracerProvider(oldTP)
		_ = tp.Shutdown(context.Background())
	})

	rdb, err := readonlydb.OpenReadOnlyDB("file:"+dbPath+"?mode=ro", 2)
	assert.NilError(t, err)
	t.Cleanup(func() { _ = rdb.Close() })

	exporter.Reset()

	parentCtx, parentSpan := tp.Tracer("test").Start(t.Context(), "readonly-query")
	var got string
	err = rdb.QueryRowContext(parentCtx, "SELECT secret FROM items WHERE id = ?", "item-1").Scan(&got)
	assert.NilError(t, err)
	assert.Equal(t, got, secretValue)
	parentSpan.End()

	spans := exporter.GetSpans()
	var foundSelect bool
	for _, s := range spans {
		if s.SpanContext.SpanID() == parentSpan.SpanContext().SpanID() {
			continue
		}
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
		if strings.Contains(stmt, "SELECT secret FROM items WHERE id = ?") {
			foundSelect = true
			assert.Equal(t, s.Parent.SpanID(), parentSpan.SpanContext().SpanID())
		}
	}

	assert.Assert(t, foundSelect, "expected SELECT span with placeholder SQL on readonly DB")
}
