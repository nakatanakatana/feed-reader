package telemetry

import (
	"context"
	"io"
	"log/slog"

	"go.opentelemetry.io/otel/trace"
)

// TraceContextHandler wraps a slog.Handler and attaches trace_id and span_id attributes
// whenever the context carries a valid active OpenTelemetry SpanContext.
type TraceContextHandler struct {
	next slog.Handler
}

// NewTraceContextHandler returns a slog.Handler that enriches records with trace_id and span_id.
func NewTraceContextHandler(next slog.Handler) slog.Handler {
	return &TraceContextHandler{next: next}
}

// NewJSONLogger returns a structured JSON slog.Logger enriched with active trace_id and span_id.
func NewJSONLogger(w io.Writer, opts *slog.HandlerOptions) *slog.Logger {
	return slog.New(NewTraceContextHandler(slog.NewJSONHandler(w, opts)))
}

func (h *TraceContextHandler) Enabled(ctx context.Context, level slog.Level) bool {
	return h.next.Enabled(ctx, level)
}

func (h *TraceContextHandler) Handle(ctx context.Context, r slog.Record) error {
	if sc := trace.SpanContextFromContext(ctx); sc.IsValid() {
		r = r.Clone()
		r.AddAttrs(
			slog.String("trace_id", sc.TraceID().String()),
			slog.String("span_id", sc.SpanID().String()),
		)
	}
	return h.next.Handle(ctx, r)
}

func (h *TraceContextHandler) WithAttrs(attrs []slog.Attr) slog.Handler {
	return &TraceContextHandler{next: h.next.WithAttrs(attrs)}
}

func (h *TraceContextHandler) WithGroup(name string) slog.Handler {
	return &TraceContextHandler{next: h.next.WithGroup(name)}
}
