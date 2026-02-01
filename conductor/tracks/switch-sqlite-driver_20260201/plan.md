# Implementation Plan - Switch SQLite Driver to ncruces/go-sqlite3

## Phase 1: Baseline & Reproduction
- [ ] Task: Create a "write-heavy" reproduction test case (e.g., `cmd/feed-reader/reproduce_busy_test.go` or a separate script) that triggers `SQLite Busy` errors with the current driver.
    - [ ] Sub-task: Implement a concurrent writer test.
    - [ ] Sub-task: Run the test and confirm failure (Busy errors) or high contention.
- [ ] Task: Run all existing tests to ensure the current state is green (ignoring the new reproduction test).
- [ ] Task: Conductor - User Manual Verification 'Baseline & Reproduction' (Protocol in workflow.md)

## Phase 2: Driver Replacement
- [ ] Task: Switch dependencies in `go.mod`.
    - [ ] Sub-task: `go get github.com/ncruces/go-sqlite3`
    - [ ] Sub-task: Remove `modernc.org/sqlite` references.
- [ ] Task: Refactor `cmd/feed-reader/main.go` to use the new driver.
    - [ ] Sub-task: Change imports to `github.com/ncruces/go-sqlite3/driver` and `_ "github.com/ncruces/go-sqlite3/embed"`.
    - [ ] Sub-task: Update `sql.Open` driver name to `sqlite3`.
- [ ] Task: Verify compilation (`go build ./cmd/feed-reader`).
- [ ] Task: Conductor - User Manual Verification 'Driver Replacement' (Protocol in workflow.md)

## Phase 3: Verification
- [ ] Task: Run the "write-heavy" reproduction test case again.
    - [ ] Sub-task: Verify it passes or errors are significantly reduced.
- [ ] Task: Run the full application test suite (`go test ./...`).
    - [ ] Sub-task: Fix any regression failures if they occur.
- [ ] Task: Conductor - User Manual Verification 'Verification' (Protocol in workflow.md)
