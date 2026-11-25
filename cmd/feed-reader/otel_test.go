package main

import (
	"context"
	"fmt"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"

	"github.com/nakatanakatana/feed-reader/internal/primarydb"
	schema "github.com/nakatanakatana/feed-reader/sql"
	"github.com/nakatanakatana/feed-reader/store"
	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/baggage"
	"go.opentelemetry.io/otel/propagation"
	sdktrace "go.opentelemetry.io/otel/sdk/trace"
	"go.opentelemetry.io/otel/sdk/trace/tracetest"
	"go.opentelemetry.io/otel/trace/noop"
	"gotest.tools/v3/assert"
)

func TestInitOTEL_Unset(t *testing.T) {
	// Ensure env is unset
	_ = os.Unsetenv("OTEL_EXPORTER_OTLP_ENDPOINT")
	
	ctx := context.Background()
	logger := slog.Default()
	
	shutdown, err := InitOTEL(ctx, logger)
	assert.NilError(t, err)
	assert.Assert(t, shutdown != nil, "shutdown function should not be nil even when OTEL is disabled (should be no-op)")
	
	// Verify it can be called without error
	err = shutdown(ctx)
	assert.NilError(t, err)
}

func TestInitOTEL_Set(t *testing.T) {
	// Set env to some dummy endpoint
	err := os.Setenv("OTEL_EXPORTER_OTLP_ENDPOINT", "localhost:4317")
	assert.NilError(t, err)
	t.Cleanup(func() { _ = os.Unsetenv("OTEL_EXPORTER_OTLP_ENDPOINT") })

	oldTP := otel.GetTracerProvider()
	oldProp := otel.GetTextMapPropagator()
	t.Cleanup(func() {
		otel.SetTracerProvider(oldTP)
		otel.SetTextMapPropagator(oldProp)
	})
	
	ctx := context.Background()
	logger := slog.Default()
	
	shutdown, err := InitOTEL(ctx, logger)
	assert.NilError(t, err)
	assert.Assert(t, shutdown != nil)
	err = shutdown(ctx)
	assert.NilError(t, err)
}

func TestNoOpBehavior(t *testing.T) {
	// Reset global tracer provider to noop for this test to avoid interference
	old := otel.GetTracerProvider()
	t.Cleanup(func() { otel.SetTracerProvider(old) })
	otel.SetTracerProvider(noop.NewTracerProvider())

	// Ensure env is unset
	_ = os.Unsetenv("OTEL_EXPORTER_OTLP_ENDPOINT")
	
	ctx := context.Background()
	logger := slog.Default()
	
	shutdown, err := InitOTEL(ctx, logger)
	assert.NilError(t, err)
	t.Cleanup(func() { _ = shutdown(ctx) })

	// Get tracer
	tracer := otel.GetTracerProvider().Tracer("test")
	_, span := tracer.Start(ctx, "test-span")
	
	// No-op spans have an invalid span context
	assert.Assert(t, !span.SpanContext().IsValid(), "span should be no-op when OTEL is disabled")
	span.End()
}

func TestGofeedFetcher_OTelPropagatesW3CTraceparentAndBaggage(t *testing.T) {
	oldTP := otel.GetTracerProvider()
	oldProp := otel.GetTextMapPropagator()
	exporter := tracetest.NewInMemoryExporter()
	tp := sdktrace.NewTracerProvider(sdktrace.WithSyncer(exporter))
	otel.SetTracerProvider(tp)
	otel.SetTextMapPropagator(propagation.NewCompositeTextMapPropagator(
		propagation.TraceContext{},
		propagation.Baggage{},
	))
	t.Cleanup(func() {
		otel.SetTracerProvider(oldTP)
		otel.SetTextMapPropagator(oldProp)
		_ = tp.Shutdown(context.Background())
	})

	db, err := primarydb.OpenDBContext(t.Context(), ":memory:")
	assert.NilError(t, err)
	t.Cleanup(func() { _ = db.Close() })
	_, err = db.ExecContext(t.Context(), schema.Schema)
	assert.NilError(t, err)
	s := store.NewStore(db)

	var gotTraceparent string
	var gotBaggage string
	var gotUA string
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		gotTraceparent = r.Header.Get("traceparent")
		gotBaggage = r.Header.Get("baggage")
		gotUA = r.Header.Get("User-Agent")
		w.Header().Set("Content-Type", "application/xml")
		_, _ = fmt.Fprint(w, `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>Trace Feed</title></channel></rss>`)
	}))
	t.Cleanup(srv.Close)

	exporter.Reset()

	parentCtx, parentSpan := tp.Tracer("test").Start(t.Context(), "fetch-feed")
	m, err := baggage.NewMember("source", "scheduler")
	assert.NilError(t, err)
	b, err := baggage.New(m)
	assert.NilError(t, err)
	parentCtx = baggage.ContextWithBaggage(parentCtx, b)

	fetcher := NewGofeedFetcher(s)
	feed, err := fetcher.Fetch(parentCtx, "", srv.URL)
	assert.NilError(t, err)
	assert.Equal(t, feed.Title, "Trace Feed")
	parentSpan.End()

	assert.Assert(t, gotTraceparent != "", "expected W3C traceparent header on outgoing feed fetch")
	assert.Equal(t, gotBaggage, "source=scheduler")
	assert.Equal(t, gotUA, UserAgent)

	var foundClientSpan bool
	for _, sp := range exporter.GetSpans() {
		if sp.Parent.SpanID() == parentSpan.SpanContext().SpanID() {
			foundClientSpan = true
			assert.Equal(t, sp.SpanContext.TraceID(), parentSpan.SpanContext().TraceID())
			break
		}
	}
	assert.Assert(t, foundClientSpan, "expected HTTP client span parented to fetch-feed")
}
