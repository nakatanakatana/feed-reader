# Implementation Plan: Identify Minimal Changes for SQLite Transaction Error

This plan focuses on systematically testing the necessity of the current fixes by reverting them one by one or in combinations using the reproduction database `fail.db`.

## Phase 1: Setup and Reproduction Environment
- [ ] Task: Prepare the verification environment.
    - [ ] Copy `fail.db` to `feed-reader.db`.
    - [ ] Ensure the application can run against this DB without migration conflicts.
- [ ] Task: Create an automated verification script.
    - [ ] Develop a script (shell or Go test) that triggers high-concurrency fetching using the existing worker pool logic.
    - [ ] The script must parse output/logs to detect "cannot start a transaction within a transaction" and "database is locked" errors.
- [ ] Task: Verify the current state (Baseline).
    - [ ] Run the verification script with the current code and confirm zero errors.
- [ ] Task: Conductor - User Manual Verification 'Setup and Reproduction Environment' (Protocol in workflow.md)

## Phase 2: Hypothesis Testing
- [ ] Task: Test Combination 1 - Only `main.go` changes.
    - [ ] Revert `WithTransaction` changes (and its call sites) to the state in `origin/main`.
    - [ ] Keep WAL mode and `MaxOpenConns(1)` in `main.go`.
    - [ ] Run the verification script and record results.
- [ ] Task: Test Combination 2 - Only `WithTransaction` changes.
    - [ ] Revert `main.go` changes (remove WAL config and `MaxOpenConns(1)`).
    - [ ] Keep the refactored `WithTransaction`.
    - [ ] Run the verification script and record results.
- [ ] Task: Test Combination 3 - Granular `main.go` config.
    - [ ] If Combination 1 passed, test without WAL mode but with `MaxOpenConns(1)`.
    - [ ] Test with WAL mode but without `MaxOpenConns(1)`.
- [ ] Task: Identify the minimal set.
    - [ ] Select the combination with the smallest diff from `origin/main` that resulted in zero errors.
- [ ] Task: Conductor - User Manual Verification 'Hypothesis Testing' (Protocol in workflow.md)

## Phase 3: Final Consolidation and Verification
- [ ] Task: Apply the identified minimal changes.
    - [ ] Implement only the confirmed necessary changes.
- [ ] Task: Final regression testing.
    - [ ] Run all project tests (`go test ./...`) to ensure no regressions.
    - [ ] Perform a final run of the concurrency verification script.
- [ ] Task: Cleanup.
    - [ ] Remove temporary verification scripts or tests created during this track.
- [ ] Task: Conductor - User Manual Verification 'Final Consolidation and Verification' (Protocol in workflow.md)
