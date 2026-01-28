# Implementation Plan - Item Deduplication

## Phase 1: Reproduction & Analysis
- [ ] Task: Analyze `sql/query.sql` and `schema.sql` to identify the specific query patterns (likely `JOIN`s) causing duplicate rows when fetching items.
- [ ] Task: Create a reproduction test case in the backend (e.g., in `store/item_store_test.go` or a new test file) that simulates the condition causing duplicates.
    - [ ] Sub-task: Setup test data that mimics the "multiple feeds" or "tag overlap" scenario.
    - [ ] Sub-task: Assert that the current query returns duplicate items.

## Phase 2: Fix & Implementation
- [ ] Task: Modify the SQL query in `sql/query.sql` to ensure unique results (using `DISTINCT` or `GROUP BY`).
- [ ] Task: Run `make sqlc` (or the project's generation command) to update the generated Go code.
- [ ] Task: Run the reproduction test to verify that duplicates are gone.
- [ ] Task: Run the full backend test suite (`go test ./...`) to ensure no regressions in filtering or sorting.
- [ ] Task: Conductor - User Manual Verification 'Fix & Implementation' (Protocol in workflow.md)
