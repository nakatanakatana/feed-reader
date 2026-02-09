# Implementation Plan: Remove testify/mock Dependency and Unify Testing Library

This plan outlines the steps to replace `testify/mock` with hand-written mocks and completely remove the `testify` dependency from the backend tests.

## Phase 1: Refactor `store/retry_db_test.go`
Replace `testify/mock` with hand-written mocks and switch assertions to `gotest.tools/v3`.

- [ ] Task: Create hand-written mock for `DBTX` interface in `store/retry_db_test.go`
- [ ] Task: Refactor `TestRetryingDB` to use the new hand-written mock
- [ ] Task: Replace `testify` assertions with `gotest.tools/v3` assertions in `store/retry_db_test.go`
- [ ] Task: Verify tests in `store/` pass
- [ ] Task: Conductor - User Manual Verification 'Phase 1: Refactor store/retry_db_test.go' (Protocol in workflow.md)

## Phase 2: Cleanup and Dependency Removal
Finalize the removal of the `testify` library.

- [ ] Task: Search for any remaining occurrences of `testify` in the entire codebase
- [ ] Task: Remove `github.com/stretchr/testify` from `go.mod` using `go mod tidy`
- [ ] Task: Run all backend tests to ensure zero regressions
- [ ] Task: Verify that `gotest.tools/v3` is used consistently across all backend tests
- [ ] Task: Conductor - User Manual Verification 'Phase 2: Cleanup and Dependency Removal' (Protocol in workflow.md)
