package main

import (
	"context"
	"log/slog"
	"os"
	"testing"

	"go.opentelemetry.io/otel"
	"gotest.tools/v3/assert"
)

func TestInitOTEL_Unset(t *testing.T) {
	// Ensure env is unset
	os.Unsetenv("OTEL_EXPORTER_OTLP_ENDPOINT")
	
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
	os.Setenv("OTEL_EXPORTER_OTLP_ENDPOINT", "localhost:4317")
	defer os.Unsetenv("OTEL_EXPORTER_OTLP_ENDPOINT")
	
	ctx := context.Background()
	logger := slog.Default()
	
	shutdown, err := InitOTEL(ctx, logger)
	assert.NilError(t, err)
	assert.Assert(t, shutdown != nil)
}

func TestNoOpBehavior(t *testing.T) {
	// Ensure env is unset
	os.Unsetenv("OTEL_EXPORTER_OTLP_ENDPOINT")
	
	ctx := context.Background()
	logger := slog.Default()
	
	shutdown, err := InitOTEL(ctx, logger)
	assert.NilError(t, err)
	defer func() { _ = shutdown(ctx) }()

	// Get tracer
	tracer := otel.GetTracerProvider().Tracer("test")
	_, span := tracer.Start(ctx, "test-span")
	
	// No-op spans have an invalid span context
	assert.Assert(t, !span.SpanContext().IsValid(), "span should be no-op when OTEL is disabled")
	span.End()
}
