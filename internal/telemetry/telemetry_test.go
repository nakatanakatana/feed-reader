package telemetry_test

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/nakatanakatana/feed-reader/internal/telemetry"
	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/baggage"
	"go.opentelemetry.io/otel/propagation"
	sdktrace "go.opentelemetry.io/otel/sdk/trace"
	"go.opentelemetry.io/otel/sdk/trace/tracetest"
	"go.opentelemetry.io/otel/trace/noop"
	"gotest.tools/v3/assert"
)

func saveAndRestoreOTelGlobals(t *testing.T) {
	t.Helper()
	oldTP := otel.GetTracerProvider()
	oldProp := otel.GetTextMapPropagator()
	t.Cleanup(func() {
		otel.SetTracerProvider(oldTP)
		otel.SetTextMapPropagator(oldProp)
	})
}

func clearOTelEnvs(t *testing.T) {
	t.Helper()
	for _, key := range []string{
		"OTEL_EXPORTER_OTLP_ENDPOINT",
		"OTEL_EXPORTER_OTLP_TRACES_ENDPOINT",
		"OTEL_EXPORTER_OTLP_PROTOCOL",
		"OTEL_EXPORTER_OTLP_TRACES_PROTOCOL",
		"OTEL_SERVICE_NAME",
		"OTEL_RESOURCE_ATTRIBUTES",
		"OTEL_TRACES_EXPORTER",
	} {
		t.Setenv(key, "")
	}
}

func TestInit_NoOpWhenEndpointUnset(t *testing.T) {
	saveAndRestoreOTelGlobals(t)
	clearOTelEnvs(t)
	otel.SetTracerProvider(noop.NewTracerProvider())

	logger := slog.New(slog.NewJSONHandler(io.Discard, nil))
	shutdown, err := telemetry.Init(t.Context(), "feed-reader", logger)
	assert.NilError(t, err)
	assert.Assert(t, shutdown != nil)

	_, span := otel.Tracer("test").Start(t.Context(), "op")
	assert.Assert(t, !span.SpanContext().IsValid(), "expected no-op span when endpoint is unset")
	span.End()

	assert.NilError(t, shutdown(t.Context()))
}

func TestInit_NoOpWhenExporterNone(t *testing.T) {
	saveAndRestoreOTelGlobals(t)
	clearOTelEnvs(t)
	otel.SetTracerProvider(noop.NewTracerProvider())

	t.Setenv("OTEL_EXPORTER_OTLP_ENDPOINT", "http://localhost:4318")
	t.Setenv("OTEL_TRACES_EXPORTER", "none")

	logger := slog.New(slog.NewJSONHandler(io.Discard, nil))
	shutdown, err := telemetry.Init(t.Context(), "feed-reader", logger)
	assert.NilError(t, err)
	assert.Assert(t, shutdown != nil)

	_, span := otel.Tracer("test").Start(t.Context(), "op")
	assert.Assert(t, !span.SpanContext().IsValid(), "expected no-op span when OTEL_TRACES_EXPORTER=none")
	span.End()

	assert.NilError(t, shutdown(t.Context()))
}

func TestInit_ProtocolsAndResourceAttributes(t *testing.T) {
	tests := []struct {
		name             string
		envs             map[string]string
		defaultService   string
		wantServiceName  string
		wantEnvAttrKey   string
		wantEnvAttrValue string
	}{
		{
			name: "grpc protocol with OTEL_SERVICE_NAME and OTEL_RESOURCE_ATTRIBUTES",
			envs: map[string]string{
				"OTEL_EXPORTER_OTLP_ENDPOINT": "http://localhost:4317",
				"OTEL_EXPORTER_OTLP_PROTOCOL": "grpc",
				"OTEL_SERVICE_NAME":           "custom-feed-reader",
				"OTEL_RESOURCE_ATTRIBUTES":    "deployment.environment=staging",
				"OTEL_TRACES_EXPORTER":        "otlp",
			},
			defaultService:   "feed-reader",
			wantServiceName:  "custom-feed-reader",
			wantEnvAttrKey:   "deployment.environment",
			wantEnvAttrValue: "staging",
		},
		{
			name: "http/protobuf protocol with default service name",
			envs: map[string]string{
				"OTEL_EXPORTER_OTLP_ENDPOINT": "http://localhost:4318",
				"OTEL_EXPORTER_OTLP_PROTOCOL": "http/protobuf",
			},
			defaultService:  "feed-reader",
			wantServiceName: "feed-reader",
		},
		{
			name: "service.name from OTEL_RESOURCE_ATTRIBUTES overrides default",
			envs: map[string]string{
				"OTEL_EXPORTER_OTLP_ENDPOINT": "http://localhost:4318",
				"OTEL_RESOURCE_ATTRIBUTES":    "service.name=from-resource-attrs",
			},
			defaultService:  "feed-reader",
			wantServiceName: "from-resource-attrs",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			saveAndRestoreOTelGlobals(t)
			clearOTelEnvs(t)
			for k, v := range tt.envs {
				t.Setenv(k, v)
			}

			logger := slog.New(slog.NewJSONHandler(io.Discard, nil))
			shutdown, err := telemetry.Init(t.Context(), tt.defaultService, logger)
			assert.NilError(t, err)
			t.Cleanup(func() {
				ctx, cancel := context.WithTimeout(context.Background(), time.Second)
				defer cancel()
				_ = shutdown(ctx)
			})

			tp, ok := otel.GetTracerProvider().(*sdktrace.TracerProvider)
			assert.Assert(t, ok, "expected *sdktrace.TracerProvider")

			// Verify span is valid and resource attributes are populated
			recorder := tracetest.NewSpanRecorder()
			tp.RegisterSpanProcessor(recorder)

			_, span := tp.Tracer("test").Start(t.Context(), "check-resource")
			assert.Assert(t, span.SpanContext().IsValid())
			span.End()

			ended := recorder.Ended()
			assert.Equal(t, len(ended), 1)
			attrs := make(map[string]string)
			for _, kv := range ended[0].Resource().Attributes() {
				attrs[string(kv.Key)] = kv.Value.AsString()
			}
			assert.Equal(t, attrs["service.name"], tt.wantServiceName)
			if tt.wantEnvAttrKey != "" {
				assert.Equal(t, attrs[tt.wantEnvAttrKey], tt.wantEnvAttrValue)
			}
		})
	}
}

func TestInit_UnsupportedValuesReturnError(t *testing.T) {
	t.Run("unsupported exporter", func(t *testing.T) {
		saveAndRestoreOTelGlobals(t)
		clearOTelEnvs(t)
		t.Setenv("OTEL_TRACES_EXPORTER", "zipkin")
		t.Setenv("OTEL_EXPORTER_OTLP_ENDPOINT", "http://localhost:4318")

		logger := slog.New(slog.NewJSONHandler(io.Discard, nil))
		_, err := telemetry.Init(t.Context(), "feed-reader", logger)
		assert.Assert(t, err != nil)
	})

	t.Run("unsupported protocol", func(t *testing.T) {
		saveAndRestoreOTelGlobals(t)
		clearOTelEnvs(t)
		t.Setenv("OTEL_EXPORTER_OTLP_ENDPOINT", "http://localhost:4318")
		t.Setenv("OTEL_EXPORTER_OTLP_PROTOCOL", "invalid-proto")

		logger := slog.New(slog.NewJSONHandler(io.Discard, nil))
		_, err := telemetry.Init(t.Context(), "feed-reader", logger)
		assert.Assert(t, err != nil)
	})
}

func TestShutdownWithTimeout(t *testing.T) {
	t.Run("passes deadline context", func(t *testing.T) {
		var hasDeadline bool
		err := telemetry.ShutdownWithTimeout(func(ctx context.Context) error {
			_, hasDeadline = ctx.Deadline()
			return nil
		}, 2*time.Second)
		assert.NilError(t, err)
		assert.Assert(t, hasDeadline, "expected shutdown context to have a deadline")
	})

	t.Run("propagates error on timeout", func(t *testing.T) {
		err := telemetry.ShutdownWithTimeout(func(ctx context.Context) error {
			<-ctx.Done()
			return ctx.Err()
		}, 20*time.Millisecond)
		assert.Assert(t, errors.Is(err, context.DeadlineExceeded))
	})
}

func TestNewHTTPHandler_ExcludesHealthAndMetricsAndPropagatesW3C(t *testing.T) {
	saveAndRestoreOTelGlobals(t)

	exporter := tracetest.NewInMemoryExporter()
	tp := sdktrace.NewTracerProvider(sdktrace.WithSyncer(exporter))
	t.Cleanup(func() { _ = tp.Shutdown(context.Background()) })
	otel.SetTracerProvider(tp)
	otel.SetTextMapPropagator(propagation.NewCompositeTextMapPropagator(
		propagation.TraceContext{},
		propagation.Baggage{},
	))

	var gotTraceID string
	var gotBaggage string
	handler := telemetry.NewHTTPHandler(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		gotBaggage = baggage.FromContext(r.Context()).Member("tenant").Value()
		if sc := otel.GetTextMapPropagator(); sc != nil {
			carrier := propagation.MapCarrier{}
			sc.Inject(r.Context(), carrier)
			gotTraceID = carrier["traceparent"]
		}
		w.WriteHeader(http.StatusOK)
	}), "http.server")

	for _, excluded := range []string{"/healthz", "/readyz", "/metrics"} {
		req := httptest.NewRequest(http.MethodGet, excluded, nil)
		rec := httptest.NewRecorder()
		handler.ServeHTTP(rec, req)
		assert.Equal(t, rec.Code, http.StatusOK)
	}
	assert.Equal(t, len(exporter.GetSpans()), 0, "excluded paths must not generate spans")

	// Request with incoming W3C traceparent and baggage
	incomingTraceID := "4bf92f3577b34da6a3ce929d0e0e4736"
	incomingParentID := "00f067aa0ba902b7"
	req := httptest.NewRequest(http.MethodGet, "/api/v2/feeds", nil)
	req.Header.Set("traceparent", "00-"+incomingTraceID+"-"+incomingParentID+"-01")
	req.Header.Set("baggage", "tenant=acme")
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	assert.Equal(t, rec.Code, http.StatusOK)
	assert.Equal(t, gotBaggage, "acme")
	assert.Assert(t, gotTraceID != "")

	spans := exporter.GetSpans()
	assert.Equal(t, len(spans), 1)
	assert.Equal(t, spans[0].SpanContext.TraceID().String(), incomingTraceID)
	assert.Equal(t, spans[0].Parent.SpanID().String(), incomingParentID)
}

func TestNewHTTPTransport_PropagatesTraceContextAndBaggage(t *testing.T) {
	saveAndRestoreOTelGlobals(t)

	exporter := tracetest.NewInMemoryExporter()
	tp := sdktrace.NewTracerProvider(sdktrace.WithSyncer(exporter))
	t.Cleanup(func() { _ = tp.Shutdown(context.Background()) })
	otel.SetTracerProvider(tp)
	otel.SetTextMapPropagator(propagation.NewCompositeTextMapPropagator(
		propagation.TraceContext{},
		propagation.Baggage{},
	))

	var gotTraceparent string
	var gotBaggage string
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		gotTraceparent = r.Header.Get("traceparent")
		gotBaggage = r.Header.Get("baggage")
		w.WriteHeader(http.StatusOK)
	}))
	t.Cleanup(srv.Close)

	client := &http.Client{
		Transport: telemetry.NewHTTPTransport(http.DefaultTransport),
	}

	parentCtx, parentSpan := tp.Tracer("test").Start(t.Context(), "parent-op")
	m, err := baggage.NewMember("env", "test")
	assert.NilError(t, err)
	b, err := baggage.New(m)
	assert.NilError(t, err)
	parentCtx = baggage.ContextWithBaggage(parentCtx, b)

	req, err := http.NewRequestWithContext(parentCtx, http.MethodGet, srv.URL+"/rss.xml", nil)
	assert.NilError(t, err)
	resp, err := client.Do(req)
	assert.NilError(t, err)
	_ = resp.Body.Close()
	parentSpan.End()

	assert.Assert(t, gotTraceparent != "", "expected traceparent header to be injected")
	assert.Equal(t, gotBaggage, "env=test")

	spans := exporter.GetSpans()
	assert.Assert(t, len(spans) >= 2)
	var clientSpan tracetest.SpanStub
	for _, s := range spans {
		if s.Parent.SpanID() == parentSpan.SpanContext().SpanID() {
			clientSpan = s
			break
		}
	}
	assert.Assert(t, clientSpan.SpanContext.IsValid(), "expected child HTTP client span")
	assert.Equal(t, clientSpan.SpanContext.TraceID(), parentSpan.SpanContext().TraceID())
}

func TestNewJSONLogger_IncludesTraceAndSpanIDWhenActiveSpan(t *testing.T) {
	exporter := tracetest.NewInMemoryExporter()
	tp := sdktrace.NewTracerProvider(sdktrace.WithSyncer(exporter))
	t.Cleanup(func() { _ = tp.Shutdown(context.Background()) })

	var buf bytes.Buffer
	logger := telemetry.NewJSONLogger(&buf, nil)

	// Without active span: no trace_id or span_id
	logger.InfoContext(t.Context(), "no span message")
	var noSpanLog map[string]any
	assert.NilError(t, json.Unmarshal(buf.Bytes(), &noSpanLog))
	_, hasTrace := noSpanLog["trace_id"]
	_, hasSpan := noSpanLog["span_id"]
	assert.Assert(t, !hasTrace, "expected no trace_id without active span")
	assert.Assert(t, !hasSpan, "expected no span_id without active span")

	// With active span: includes trace_id and span_id
	buf.Reset()
	ctx, span := tp.Tracer("test").Start(t.Context(), "logged-op")
	defer span.End()

	logger.With("component", "test").InfoContext(ctx, "with span message")
	var withSpanLog map[string]any
	assert.NilError(t, json.Unmarshal(buf.Bytes(), &withSpanLog))
	assert.Equal(t, withSpanLog["trace_id"], span.SpanContext().TraceID().String())
	assert.Equal(t, withSpanLog["span_id"], span.SpanContext().SpanID().String())
	assert.Equal(t, withSpanLog["component"], "test")
}
