package telemetry

import (
	"cmp"
	"context"
	"fmt"
	"log/slog"
	"net"
	"net/url"
	"os"
	"strings"
	"time"

	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracegrpc"
	"go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracehttp"
	"go.opentelemetry.io/otel/propagation"
	"go.opentelemetry.io/otel/sdk/resource"
	sdktrace "go.opentelemetry.io/otel/sdk/trace"
	semconv "go.opentelemetry.io/otel/semconv/v1.26.0"
)

// DefaultShutdownTimeout is the default timeout for flushing and shutting down the TracerProvider.
const DefaultShutdownTimeout = 5 * time.Second

// Init initializes the OpenTelemetry TracerProvider and W3C propagators from standard
// OTEL_* environment variables. When tracing is disabled (OTEL_TRACES_EXPORTER=none or
// no OTLP endpoint is configured), it leaves tracing as no-op and returns a safe no-op
// shutdown function.
func Init(ctx context.Context, defaultServiceName string, logger *slog.Logger) (func(context.Context) error, error) {
	noopShutdown := func(context.Context) error { return nil }

	exporterType := strings.ToLower(strings.TrimSpace(os.Getenv("OTEL_TRACES_EXPORTER")))
	switch exporterType {
	case "", "otlp":
	case "none":
		if logger != nil {
			logger.InfoContext(ctx, "OTEL_TRACES_EXPORTER is none, tracing is disabled")
		}
		return noopShutdown, nil
	default:
		return nil, fmt.Errorf("unsupported OTEL_TRACES_EXPORTER: %q", exporterType)
	}

	endpoint := strings.TrimSpace(cmp.Or(
		os.Getenv("OTEL_EXPORTER_OTLP_TRACES_ENDPOINT"),
		os.Getenv("OTEL_EXPORTER_OTLP_ENDPOINT"),
	))
	if endpoint == "" {
		if logger != nil {
			logger.InfoContext(ctx, "OTEL_EXPORTER_OTLP_ENDPOINT is not set, tracing is disabled")
		}
		return noopShutdown, nil
	}

	protocol := strings.ToLower(strings.TrimSpace(cmp.Or(
		os.Getenv("OTEL_EXPORTER_OTLP_TRACES_PROTOCOL"),
		os.Getenv("OTEL_EXPORTER_OTLP_PROTOCOL"),
	)))
	if protocol == "" {
		if isGRPCEndpoint(endpoint) {
			protocol = "grpc"
		} else {
			protocol = "http/protobuf"
		}
	}

	var (
		exporter sdktrace.SpanExporter
		err      error
	)
	switch protocol {
	case "grpc":
		exporter, err = otlptracegrpc.New(ctx)
	case "http/protobuf":
		exporter, err = otlptracehttp.New(ctx)
	default:
		return nil, fmt.Errorf("unsupported OTEL_EXPORTER_OTLP_PROTOCOL: %q", protocol)
	}
	if err != nil {
		return nil, fmt.Errorf("create OTLP trace exporter (%s): %w", protocol, err)
	}

	resOpts := []resource.Option{}
	if defaultServiceName != "" {
		resOpts = append(resOpts, resource.WithAttributes(semconv.ServiceNameKey.String(defaultServiceName)))
	}
	resOpts = append(resOpts,
		resource.WithFromEnv(),
		resource.WithTelemetrySDK(),
		resource.WithProcess(),
		resource.WithOS(),
		resource.WithContainer(),
		resource.WithHost(),
	)

	res, err := resource.New(ctx, resOpts...)
	if err != nil {
		_ = exporter.Shutdown(ctx)
		return nil, fmt.Errorf("build OTel resource: %w", err)
	}

	tp := sdktrace.NewTracerProvider(
		sdktrace.WithBatcher(exporter),
		sdktrace.WithResource(res),
	)
	otel.SetTracerProvider(tp)
	otel.SetTextMapPropagator(propagation.NewCompositeTextMapPropagator(
		propagation.TraceContext{},
		propagation.Baggage{},
	))

	return tp.Shutdown, nil
}

// ShutdownWithTimeout invokes the OTel shutdown function with a bounded context timeout.
func ShutdownWithTimeout(shutdown func(context.Context) error, timeout time.Duration) error {
	if shutdown == nil {
		return nil
	}
	ctx, cancel := context.WithTimeout(context.Background(), timeout)
	defer cancel()
	return shutdown(ctx)
}

func isGRPCEndpoint(endpoint string) bool {
	if strings.Contains(endpoint, "://") {
		u, err := url.Parse(endpoint)
		if err != nil {
			return false
		}
		return u.Port() == "4317"
	}
	_, port, err := net.SplitHostPort(endpoint)
	return err == nil && port == "4317"
}
