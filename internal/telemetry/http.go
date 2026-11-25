package telemetry

import (
	"net/http"

	"go.opentelemetry.io/contrib/instrumentation/net/http/otelhttp"
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

// NewHTTPHandler wraps an http.Handler with OpenTelemetry HTTP server instrumentation,
// propagating W3C traceparent/baggage and excluding health/metrics endpoints.
func NewHTTPHandler(handler http.Handler, operation string) http.Handler {
	return otelhttp.NewHandler(
		handler,
		operation,
		otelhttp.WithFilter(ShouldTraceHTTPRequest),
	)
}

// NewHTTPTransport wraps an http.RoundTripper with OpenTelemetry HTTP client instrumentation,
// creating client spans and propagating W3C traceparent/baggage headers.
func NewHTTPTransport(base http.RoundTripper) http.RoundTripper {
	return otelhttp.NewTransport(base)
}
