# Implementation Plan: Remove testify/mock Dependency and Unify Testing Library

This plan outlines the steps to replace `testify/mock` with hand-written mocks and completely remove the `testify` dependency from the backend tests.

## Phase 1: Refactor `store/retry_db_test.go` [checkpoint: 2dca918]
Replace `testify/mock` with hand-written mocks and switch assertions to `gotest.tools/v3`.

- [x] Task: Create hand-written mock for `DBTX` interface in `store/retry_db_test.go`
- [x] Task: Refactor `TestRetryingDB` to use the new hand-written mock
- [x] Task: Replace `testify` assertions with `gotest.tools/v3` assertions in `store/retry_db_test.go`
- [x] Task: Verify tests in `store/` pass cc40a9d
- [x] Task: Conductor - User Manual Verification 'Phase 1: Refactor store/retry_db_test.go' (Protocol in workflow.md) 2dca918

## Phase 2: Cleanup and Dependency Removal [checkpoint: a9fc929]
Finalize the removal of the `testify` library.

- [x] Task: Search for any remaining occurrences of `testify` in the entire codebase
- [x] Task: Remove `github.com/stretchr/testify` from `go.mod` using `go mod tidy` 03392bc
- [x] Task: Run all backend tests to ensure zero regressions
- [x] Task: Verify that `gotest.tools/v3` is used consistently across all backend tests
- [x] Task: Conductor - User Manual Verification 'Phase 2: Cleanup and Dependency Removal' (Protocol in workflow.md) a9fc929
