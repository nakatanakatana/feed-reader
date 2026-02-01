# Implementation Plan - Switch SQLite Driver to ncruces/go-sqlite3

## Phase 1: Baseline & Reproduction [checkpoint: 95502d4]
- [x] Task: Create a "write-heavy" reproduction test case (e.g., `cmd/feed-reader/reproduce_busy_test.go` or a separate script) that triggers `SQLite Busy` errors with the current driver. [342a4b8]
    - [x] Sub-task: Implement a concurrent writer test.
    - [x] Sub-task: Run the test and confirm failure (Busy errors) or high contention.
- [x] Task: Run all existing tests to ensure the current state is green (ignoring the new reproduction test). [342a4b8]
- [x] Task: Conductor - User Manual Verification 'Baseline & Reproduction' (Protocol in workflow.md) [95502d4]

## Phase 2: Driver Replacement [checkpoint: 9614ce5]
- [x] Task: Switch dependencies in `go.mod`. [bbc141e]
    - [x] Sub-task: `go get github.com/ncruces/go-sqlite3`
    - [x] Sub-task: Remove `modernc.org/sqlite` references.
- [x] Task: Refactor `cmd/feed-reader/main.go` to use the new driver. [2ba4d45]
    - [x] Sub-task: Change imports to `github.com/ncruces/go-sqlite3/driver` and `_ "github.com/ncruces/go-sqlite3/embed"`.
    - [x] Sub-task: Update `sql.Open` driver name to `sqlite3`.
- [x] Task: Verify compilation (`go build ./cmd/feed-reader`). [2ba4d45]
- [x] Task: Conductor - User Manual Verification 'Driver Replacement' (Protocol in workflow.md) [9614ce5]

## Phase 3: Verification [checkpoint: c9dfce2]
- [x] Task: Run the "write-heavy" reproduction test case again. [2ddb772]
    - [x] Sub-task: Verify it passes or errors are significantly reduced.
- [x] Task: Run the full application test suite (`go test ./...`). [2ddb772]
    - [x] Sub-task: Fix any regression failures if they occur.
- [x] Task: Conductor - User Manual Verification 'Verification' (Protocol in workflow.md) [c9dfce2]
