# Specification: OTEL Tracing Integration

## Overview
This track introduces OpenTelemetry (OTEL) tracing to provide observability into the application's performance. It aims to capture request-level traces spanning from the frontend to the backend, including database query execution and background worker tasks. The tracing system will be "opt-in," only activating its exporter when the necessary environment variables are provided.

## Functional Requirements

### Backend (Go)
- **API Instrumentation:** Implement tracing middleware for Connect RPC to capture RTT and request metadata.
- **Database Instrumentation:** Use `github.com/XSAM/otelsql` to wrap the SQLite driver and record spans for SQL queries.
- **Background Worker Instrumentation:** Add spans to the feed fetcher and other background services to track processing time.
- **Context Propagation:** Support W3C TraceContext for distributed tracing between frontend and backend.
- **Dynamic Configuration:** 
    - Initialize OTEL SDK and OTLP exporter only if `OTEL_EXPORTER_OTLP_ENDPOINT` is set.
    - If not set, use a "No-op" provider to avoid unnecessary overhead or export attempts.

### Frontend (SolidJS)
- **Instrumentation:** Instrument key user actions and API calls.
- **Context Propagation:** Inject W3C TraceContext headers into API requests sent via Connect RPC.
- **Web Vitals:** Capture and export Core Web Vitals (LCP, FID, CLS) as part of the trace data.

## Non-Functional Requirements
- **Performance:** Tracing should introduce negligible overhead when disabled.
- **Reliability:** The application must not crash if the OTLP collector is unreachable.
- **Coverage:** New tracing and configuration logic must have >80% test coverage.

## Acceptance Criteria
- [ ] Traces are correctly exported to an OTLP collector when `OTEL_EXPORTER_OTLP_ENDPOINT` is configured.
- [ ] API spans contain child spans for corresponding SQLite queries.
- [ ] Background fetcher spans are visible in the trace collector.
- [ ] Frontend and backend spans are unified into a single trace per request.
- [ ] No traces are exported when the environment variable is missing.
- [ ] All new code passes linting and meets coverage requirements.

## Out of Scope
- Logging and Metrics integration (this track focuses on Tracing).
- Advanced sampling strategies (using Parent Based default).
