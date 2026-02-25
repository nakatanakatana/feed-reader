package main

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"

	"connectrpc.com/connect"
	"connectrpc.com/otelconnect"
	feedv1 "github.com/nakatanakatana/feed-reader/gen/go/feed/v1"
	"github.com/nakatanakatana/feed-reader/gen/go/feed/v1/feedv1connect"
	"github.com/nakatanakatana/feed-reader/store"
	"go.opentelemetry.io/otel"
	sdktrace "go.opentelemetry.io/otel/sdk/trace"
	"go.opentelemetry.io/otel/sdk/trace/tracetest"
	"go.opentelemetry.io/otel/trace"
	"gotest.tools/v3/assert"
)

func TestConnectRPCTracing(t *testing.T) {
	// Setup trace recorder
	sr := tracetest.NewSpanRecorder()
	tp := sdktrace.NewTracerProvider(sdktrace.WithSpanProcessor(sr))
	otel.SetTracerProvider(tp)

	// Create otelconnect interceptor
	interceptor, err := otelconnect.NewInterceptor()
	assert.NilError(t, err)

	// Setup server with interceptor
	_, db := setupTestDB(t)
	s := store.NewStore(db)
	feedServer := NewFeedServer(s, mockUUIDGenerator{}, &mockFetcher{}, &mockItemFetcher{}, nil)
	feedPath, handler := feedv1connect.NewFeedServiceHandler(feedServer, connect.WithInterceptors(interceptor))
	
	mux := http.NewServeMux()
	mux.Handle(feedPath, handler)
	
	server := httptest.NewServer(handler)
	defer server.Close()

	// Setup client with interceptor
	client := feedv1connect.NewFeedServiceClient(server.Client(), server.URL, connect.WithInterceptors(interceptor))

	// Perform request
	ctx := context.Background()
	_, err = client.ListFeeds(ctx, connect.NewRequest(&feedv1.ListFeedsRequest{}))
	assert.NilError(t, err)

	// Verify spans
	spans := sr.Ended()
	// Should have at least client and server spans
	assert.Assert(t, len(spans) >= 2, "expected at least 2 spans (client and server), got %d", len(spans))
	
	foundServerSpan := false
	for _, span := range spans {
		if span.SpanKind() == trace.SpanKindServer {
			foundServerSpan = true
			assert.Equal(t, span.Name(), "feed.v1.FeedService/ListFeeds")
		}
	}
	assert.Assert(t, foundServerSpan, "should have found a server span")
}
