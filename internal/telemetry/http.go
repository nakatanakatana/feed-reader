package telemetry

import (
	"net/http"
	"strings"

	"go.opentelemetry.io/contrib/instrumentation/net/http/otelhttp"
	semconv "go.opentelemetry.io/otel/semconv/v1.43.0"
	"go.opentelemetry.io/otel/trace"
)

// ShouldTraceHTTPRequest reports whether an incoming HTTP request should generate a server span.
// Health check and metrics endpoints are excluded to avoid noisy telemetry.
func ShouldTraceHTTPRequest(r *http.Request) bool {
	switch r.URL.Path {
	case "/healthz", "/readyz", "/metrics":
		return false
	default:
		return true
	}
}

// HTTPRouteFromPattern extracts the path template from Go 1.22+ http.Request.Pattern
// (e.g. "GET /api/v2/items/{id}" -> "/api/v2/items/{id}", "example.com/foo" -> "/foo").
func HTTPRouteFromPattern(pattern string) string {
	pattern = strings.TrimSpace(pattern)
	if pattern == "" {
		return ""
	}
	if _, route, ok := strings.Cut(pattern, " "); ok {
		pattern = strings.TrimSpace(route)
	}
	if idx := strings.IndexByte(pattern, '/'); idx >= 0 {
		return pattern[idx:]
	}
	return ""
}

// NewHTTPHandler wraps an http.Handler with OpenTelemetry HTTP server instrumentation,
// propagating W3C traceparent/baggage, excluding health/metrics endpoints, and recording
// http.route and the span name from Go 1.22+ ServeMux r.Pattern when matched.
func NewHTTPHandler(handler http.Handler, operation string) http.Handler {
	wrapped := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		defer func() {
			if route := HTTPRouteFromPattern(r.Pattern); route != "" {
				span := trace.SpanFromContext(r.Context())
				span.SetAttributes(semconv.HTTPRoute(route))
				if r.Method != "" {
					span.SetName(r.Method + " " + route)
				} else {
					span.SetName(route)
				}
			}
		}()
		handler.ServeHTTP(w, r)
	})
	return otelhttp.NewHandler(
		wrapped,
		operation,
		otelhttp.WithFilter(ShouldTraceHTTPRequest),
	)
}

// NewHTTPTransport wraps an http.RoundTripper with OpenTelemetry HTTP client instrumentation,
// creating client spans and propagating W3C traceparent/baggage headers.
func NewHTTPTransport(base http.RoundTripper) http.RoundTripper {
	return otelhttp.NewTransport(base)
}
