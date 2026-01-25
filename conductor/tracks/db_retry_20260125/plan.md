# Implementation Plan: Backend Database Write Retry Mechanism

This plan introduces an application-level retry mechanism with exponential backoff for SQLite database operations, specifically targeting transient lock conflicts (`SQLITE_BUSY`).

## Phase 1: Foundation - Retry Logic and Error Detection
Implement the core retry engine and SQLite error identification logic.

- [x] Task: Define SQLite error detection utility. d5ad1b4
    - [ ] Write tests to verify `isBusyError` identifies `SQLITE_BUSY` and `SQLITE_LOCKED`.
    - [ ] Implement `isBusyError(err error) bool` in `store/retry.go`.
- [ ] Task: Implement generic retry logic with exponential backoff.
    - [ ] Write tests for the retry function ensuring backoff timing and max attempts.
    - [ ] Implement `withRetry(ctx, operation)` in `store/retry.go`.
- [ ] Task: Conductor - User Manual Verification 'Phase 1: Foundation' (Protocol in workflow.md)

## Phase 2: Integration - DBTX Wrapper
Create a wrapper for `DBTX` (database/transaction interface) that automatically applies the retry logic to all operations.

- [ ] Task: Create `RetryingDB` wrapper.
    - [ ] Write tests ensuring `RetryingDB` calls the underlying `DBTX` and retries on busy errors.
    - [ ] Implement `RetryingDB` in `store/retry_db.go` satisfying the `DBTX` interface.
- [ ] Task: Update `Store` to use `RetryingDB`.
    - [ ] Modify `NewStore` in `store/feed_store.go` to wrap the `DBTX` passed to `New`.
- [ ] Task: Implement Transaction Retry.
    - [ ] Write tests for retrying `BeginTx`.
    - [ ] Create a helper in `Store` to start transactions with retries.
- [ ] Task: Conductor - User Manual Verification 'Phase 2: Integration' (Protocol in workflow.md)

## Phase 3: Verification and Refactoring
Ensure the mechanism works under simulated pressure and clean up the implementation.

- [ ] Task: Integration Test with Simulated Locks.
    - [ ] Create a test that induces `SQLITE_BUSY` (e.g., using two concurrent transactions) and verifies successful completion via retries.
- [ ] Task: Verify Coverage and Quality Gates.
    - [ ] Ensure `store` package coverage is >80%.
    - [ ] Run `golangci-lint` and `go test ./...`.
- [ ] Task: Conductor - User Manual Verification 'Phase 3: Verification' (Protocol in workflow.md)
