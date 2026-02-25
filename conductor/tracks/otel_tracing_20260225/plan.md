# Implementation Plan: OTEL Tracing Integration

## Phase 1: Backend Infrastructure & Configuration [checkpoint: 014e396]
- [x] Task: Research and define OTEL SDK initialization logic in Go.
- [x] Task: Write Tests: Verify OTEL provider initialization based on environment variables. 6ea6a14
- [x] Task: Implement: Create `otel` package to manage tracer provider and OTLP exporter setup. 6ea6a14
- [x] Task: Conductor - User Manual Verification 'Backend Infrastructure & Configuration' (Protocol in workflow.md) 014e396

## Phase 2: Backend Instrumentation [checkpoint: 6e8ebd5]
- [x] Task: Write Tests: Verify Connect RPC interceptor adds tracing spans.
- [x] Task: Implement: Add Connect RPC tracing interceptor to the server. 2c83da0
- [x] Task: Write Tests: Verify `otelsql` records spans for database queries.
- [x] Task: Implement: Integrate `github.com/XSAM/otelsql` into the database connection logic. 402b979
- [x] Task: Write Tests: Verify background workers create spans.
- [x] Task: Implement: Add tracing to the fetcher service and worker pool. e78b447
- [x] Task: Conductor - User Manual Verification 'Backend Instrumentation' (Protocol in workflow.md) 6e8ebd5

## Phase 3: Frontend Instrumentation [checkpoint: 7e8dab2]
- [x] Task: Research OTEL libraries for SolidJS (e.g., `@opentelemetry/sdk-trace-web`).
- [x] Task: Write Tests: Verify frontend traces include context propagation headers.
- [x] Task: Implement: Setup OTEL Web SDK in the frontend and configure context propagation. 199faa2
- [x] Task: Write Tests: Verify Web Vitals are captured. 199faa2
- [x] Task: Implement: Integrate `web-vitals` library to capture LCP, FCP, CLS. 199faa2
- [x] Task: Conductor - User Manual Verification 'Frontend Instrumentation' (Protocol in workflow.md) 7e8dab2

## Phase 4: Integration & E2E Validation [checkpoint: 872921c]
- [x] Task: Verify end-to-end trace flow from frontend to backend DB queries using a local OTLP collector. 199faa2
- [x] Task: Verify no-op behavior when `OTEL_EXPORTER_OTLP_ENDPOINT` is unset. a848fa8
- [x] Task: Conductor - User Manual Verification 'Integration & E2E Validation' (Protocol in workflow.md) 872921c
