package telemetry_test

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/nakatanakatana/feed-reader/internal/telemetry"
	"go.opentelemetry.io/otel"
	sdktrace "go.opentelemetry.io/otel/sdk/trace"
	"go.opentelemetry.io/otel/sdk/trace/tracetest"
	"gotest.tools/v3/assert"
)

func TestHTTPRouteFromPattern(t *testing.T) {
	tests := []struct {
		pattern string
		want    string
	}{
		{pattern: "GET /api/v2/items/{id}", want: "/api/v2/items/{id}"},
		{pattern: "/api/v2/feeds", want: "/api/v2/feeds"},
		{pattern: "POST example.com/api/v2/feeds", want: "/api/v2/feeds"},
		{pattern: "example.com/status", want: "/status"},
		{pattern: "", want: ""},
		{pattern: "   ", want: ""},
	}
	for _, tt := range tests {
		assert.Equal(t, telemetry.HTTPRouteFromPattern(tt.pattern), tt.want)
	}
}

func TestNewHTTPHandler_RecordsHTTPRouteAndSpanNameFromServeMux(t *testing.T) {
	oldTP := otel.GetTracerProvider()
	exporter := tracetest.NewInMemoryExporter()
	tp := sdktrace.NewTracerProvider(sdktrace.WithSyncer(exporter))
	otel.SetTracerProvider(tp)
	t.Cleanup(func() {
		otel.SetTracerProvider(oldTP)
		_ = tp.Shutdown(context.Background())
	})

	mux := http.NewServeMux()
	mux.HandleFunc("GET /api/v2/items/{id}", func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusOK)
	})
	handler := telemetry.NewHTTPHandler(mux, "feed-reader")

	req := httptest.NewRequest(http.MethodGet, "/api/v2/items/abc-123", nil)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	assert.Equal(t, rec.Code, http.StatusOK)

	spans := exporter.GetSpans()
	assert.Equal(t, len(spans), 1)
	assert.Equal(t, spans[0].Name, "GET /api/v2/items/{id}")

	var gotRoute string
	for _, kv := range spans[0].Attributes {
		if kv.Key == "http.route" {
			gotRoute = kv.Value.String()
		}
	}
	assert.Equal(t, gotRoute, "/api/v2/items/{id}")
}
