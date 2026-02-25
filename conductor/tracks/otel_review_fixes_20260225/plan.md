# Implementation Plan: OTEL Review Feedback Improvements

## Phase 1: Backend Fixes
- [x] Task: Update backend tests to restore global OTEL state and check ignored errors.
- [x] Task: Clean up `go.mod` using `go mod tidy`.
- [x] Task: Make `WithTrustRemote()` conditional or add documentation.

## Phase 2: Frontend Fixes
- [x] Task: Update `initOTEL` to be idempotent and use configurable exporter URL.
- [x] Task: Gate frontend OTEL initialization in `main.tsx`.

## Phase 3: Validation
- [x] Task: Verify all backend and frontend tests pass.
- [x] Task: Verify linting.
- [~] Task: Push changes and update PR.
