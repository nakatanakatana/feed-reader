package main

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
	"testing/fstest"

	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/propagation"
	sdktrace "go.opentelemetry.io/otel/sdk/trace"
	"go.opentelemetry.io/otel/sdk/trace/tracetest"
	"gotest.tools/v3/assert"
)

func TestNewMux_OTelTracingExcludesProbesAndTracesAPIWithSQL(t *testing.T) {
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

	db := setupQueryableDB(t)
	handler := newMux(db, fstest.MapFS{"index.html": &fstest.MapFile{Data: []byte("ok")}}, nil)

	exporter.Reset()

	// Probes must not generate HTTP server spans
	for _, path := range []string{"/healthz", "/readyz", "/metrics"} {
		req := httptest.NewRequest(http.MethodGet, path, nil)
		rec := httptest.NewRecorder()
		handler.ServeHTTP(rec, req)
	}
	for _, s := range exporter.GetSpans() {
		assert.Assert(t, s.Name != "feed-reader-readonly", "probe path must not create HTTP server span")
	}

	exporter.Reset()

	// API request propagates W3C traceparent to HTTP server span and child SQLite spans
	incomingTraceID := "4bf92f3577b34da6a3ce929d0e0e4736"
	incomingParentID := "00f067aa0ba902b7"
	req := httptest.NewRequest(http.MethodGet, "/api/v2/feeds", nil)
	req.Header.Set("traceparent", "00-"+incomingTraceID+"-"+incomingParentID+"-01")
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	assert.Equal(t, rec.Code, http.StatusOK)

	spans := exporter.GetSpans()
	assert.Assert(t, len(spans) >= 2, "expected HTTP server span and at least one SQLite child span")

	var serverSpanID string
	var hasSQLChild bool
	for _, s := range spans {
		assert.Equal(t, s.SpanContext.TraceID().String(), incomingTraceID)
		if s.Parent.SpanID().String() == incomingParentID {
			serverSpanID = s.SpanContext.SpanID().String()
		}
	}
	assert.Assert(t, serverSpanID != "", "expected HTTP server span parented to incoming traceparent")

	for _, s := range spans {
		if s.Parent.SpanID().String() == serverSpanID {
			hasSQLChild = true
			break
		}
	}
	assert.Assert(t, hasSQLChild, "expected SQLite span parented to HTTP server span")
}
