# Specification: OTEL Review Feedback Improvements

## Overview
Improve the robustness, security, and configurability of the OpenTelemetry integration based on PR review feedback.

## Requirements

### Backend (Go)
- **Test Robustness:** Ensure all tests that modify global tracer providers restore the previous state and shut down new providers.
- **Error Handling:** Explicitly check and assert errors currently being ignored in tests (Setenv, Unsetenv, Close, TraceID parsing, Interceptor creation).
- **Dependency Management:** Run `go mod tidy` to ensure direct dependencies are correctly recorded.
- **Security:** Make `WithTrustRemote()` conditional or clearly documented as a trust boundary.

### Frontend (SolidJS)
- **Configurability:** Make the OTEL exporter URL configurable via environment variables (Vite) and gate initialization.
- **Idempotency:** Ensure `initOTEL()` can be called multiple times without duplicate instrumentation.
- **Opt-in:** Change frontend initialization to be opt-in, consistent with the backend.

## Acceptance Criteria
- [ ] Backend tests leave no global state side effects.
- [ ] No ignored errors in OTEL-related code/tests.
- [ ] Frontend OTEL is only active when configured via `VITE_OTEL_EXPORTER_URL`.
- [ ] `go.mod` is clean.
