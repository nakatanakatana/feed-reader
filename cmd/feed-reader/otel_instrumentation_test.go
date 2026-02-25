package main

import (
	"context"
	"database/sql"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"connectrpc.com/connect"
	"connectrpc.com/otelconnect"
	"github.com/XSAM/otelsql"
	feedv1 "github.com/nakatanakatana/feed-reader/gen/go/feed/v1"
	"github.com/nakatanakatana/feed-reader/gen/go/feed/v1/feedv1connect"
	"github.com/nakatanakatana/feed-reader/store"
	"go.opentelemetry.io/otel"
	sdktrace "go.opentelemetry.io/otel/sdk/trace"
	"go.opentelemetry.io/otel/sdk/trace/tracetest"
	semconv "go.opentelemetry.io/otel/semconv/v1.26.0"
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

func TestDatabaseTracing(t *testing.T) {
	// Setup trace recorder
	sr := tracetest.NewSpanRecorder()
	tp := sdktrace.NewTracerProvider(sdktrace.WithSpanProcessor(sr))
	otel.SetTracerProvider(tp)

	// Open DB with otelsql
	driverName, err := otelsql.Register("sqlite", otelsql.WithAttributes(semconv.DBSystemSqlite))
	assert.NilError(t, err)

	db, err := sql.Open(driverName, ":memory:")
	assert.NilError(t, err)
	defer db.Close()

	// Perform query
	ctx := context.Background()
	_, err = db.ExecContext(ctx, "CREATE TABLE test (id INT)")
	assert.NilError(t, err)

	// Verify spans
	spans := sr.Ended()
	assert.Assert(t, len(spans) > 0, "should have at least one span for DB query")
	
	foundDBSpan := false
	for _, span := range spans {
		for _, attr := range span.Attributes() {
			if attr.Key == semconv.DBSystemKey && attr.Value.AsString() == "sqlite" {
				foundDBSpan = true
				break
			}
		}
	}
	assert.Assert(t, foundDBSpan, "should have found a DB span")
}

func TestWorkerPoolTracing(t *testing.T) {
	// Setup trace recorder
	sr := tracetest.NewSpanRecorder()
	tp := sdktrace.NewTracerProvider(sdktrace.WithSpanProcessor(sr))
	otel.SetTracerProvider(tp)

	pool := NewWorkerPool(1)
	ctx, cancel := context.WithCancel(context.Background())
	pool.Start(ctx)

	done := make(chan struct{})
	pool.AddTask(func(ctx context.Context) error {
		defer close(done)
		return nil
	})

	<-done
	cancel()
	pool.Wait()

	spans := sr.Ended()
	assert.Assert(t, len(spans) > 0, "should have at least one span for worker task")
	
	foundWorkerSpan := false
	for _, span := range spans {
		if span.Name() == "worker_pool.task" {
			foundWorkerSpan = true
			break
		}
	}
	assert.Assert(t, foundWorkerSpan, "should have found a worker task span")
}

func TestFetcherServiceTracing(t *testing.T) {
	// Setup trace recorder
	sr := tracetest.NewSpanRecorder()
	tp := sdktrace.NewTracerProvider(sdktrace.WithSpanProcessor(sr))
	otel.SetTracerProvider(tp)

	_, db := setupTestDB(t)
	s := store.NewStore(db)
	fetcher := &mockFetcher{}
	pool := NewWorkerPool(1)
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	pool.Start(ctx)
	wq := NewWriteQueueService(s, WriteQueueConfig{MaxBatchSize: 1, FlushInterval: time.Millisecond}, slog.Default())
	go wq.Start(ctx)

	svc := NewFetcherService(s, fetcher, pool, wq, slog.Default(), time.Hour)
	
	f := store.FullFeed{ID: "f1", Url: "u1"}
	err := svc.FetchAndSave(ctx, f)
	assert.NilError(t, err)

	spans := sr.Ended()
	foundFetchSpan := false
	for _, span := range spans {
		if span.Name() == "FetcherService.FetchAndSave" {
			foundFetchSpan = true
			break
		}
	}
	assert.Assert(t, foundFetchSpan, "should have found a fetcher service span")
}
