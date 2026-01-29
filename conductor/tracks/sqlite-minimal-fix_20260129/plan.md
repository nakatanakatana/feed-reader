# Implementation Plan: Identify Minimal Changes for SQLite Transaction Error

This plan focuses on systematically testing the necessity of the current fixes by reverting them one by one or in combinations using the reproduction database `fail.db`.

## Phase 1: Setup and Reproduction Environment
- [~] Task: Prepare the verification environment.
    - [ ] Copy `fail.db` to `feed-reader.db`.
    - [ ] Ensure the application can run against this DB without migration conflicts.
- [x] Task: Create an automated verification script.
    - [x] Develop a script (shell or Go test) that triggers high-concurrency fetching using the existing worker pool logic.
    - [x] The script must parse output/logs to detect "cannot start a transaction within a transaction" and "database is locked" errors.
- [x] Task: Verify the current state (Baseline).
    - [x] Run the verification script and confirm zero errors.
    - [x] Conductor - User Manual Verification 'Setup and Reproduction Environment' (Protocol in workflow.md)

## Phase 2: Hypothesis Testing
- [x] Task: Test Combination 1 - Only `main.go` changes.
    - [x] Revert `WithTransaction` changes (and its call sites) to the state in `origin/main`.
    - [x] Keep WAL mode and `MaxOpenConns(1)` in `main.go`.
    - [x] Run the verification script and record results (Result: 0 errors).
- [x] Task: Test Combination 2 - Only `WithTransaction` changes.
    - [x] Revert `main.go` changes (remove WAL config and `MaxOpenConns(1)`).
    - [x] Keep the refactored `WithTransaction`.
    - [x] Run the verification script and record results (Result: 0 errors).
- [x] Task: Test Combination 3 - Granular `main.go` config.
    - [x] If Combination 1 passed, test without WAL mode but with `MaxOpenConns(1)`.
    - [x] Test with WAL mode but without `MaxOpenConns(1)`.
    - [x] Verified that WAL+Timeout allows concurrency, while MaxOpenConns(1) serializes it.
- [x] Task: Identify the minimal set.
    - [x] Select the combination with the smallest diff from `origin/main` that resulted in zero errors.
    - [x] Conclusion: Keep `WithTransaction` fix (for safety/nesting), Keep WAL+Timeout (for concurrency), Remove `MaxOpenConns(1)` (to improve UI UX).

## Phase 3: Final Consolidation and Verification
- [x] Task: Apply the identified minimal changes.
    - [x] Implement only the confirmed necessary changes.
    - [x] Removed `MaxOpenConns(1)` from `cmd/feed-reader/main.go`. Kept `WAL` and `busy_timeout`. Kept `WithTransaction` fix.
- [x] Task: Final regression testing.
    - [x] Run all project tests (`go test ./...`) to ensure no regressions.
    - [x] Perform a final run of the concurrency verification script.
- [x] Task: Cleanup.
    - [x] Remove temporary verification scripts or tests created during this track.
- [ ] Task: Conductor - User Manual Verification 'Final Consolidation and Verification' (Protocol in workflow.md)
