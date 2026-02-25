package main

import (
	"context"
	"log/slog"
	"os"
	"testing"

	"go.opentelemetry.io/otel"
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
