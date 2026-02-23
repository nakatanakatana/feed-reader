# Implementation Plan: SQLite Foreign Key Support and Delete Cascade

## Phase 1: Reproduce Issue (Red Phase)
- [x] Task: Create a new test file `store/cascade_test.go` to verify the failure of cascade deletion. [c96e374]
- [x] Task: Implement a test case that creates a Feed, adds an Item and a Tag, links them, and then deletes the Feed. Assert that the links (`feed_items`, `feed_tags`, `feed_fetcher`) still exist (proving the failure). [c96e374]
- [x] Task: Confirm the test fails as expected. [c96e374]

## Phase 2: Implementation (Green Phase) [checkpoint: 4d2b420]
- [x] Task: Create a central database opening utility `store/db_conn.go` that enables foreign keys and other recommended pragmas (e.g., WAL mode if appropriate, but at least `foreign_keys=ON`). [534540d]
- [x] Task: Update `cmd/feed-reader/main.go` to use this new utility for opening the database. [534540d]
- [x] Task: Refactor all existing `store` tests and `cmd` tests to use the central utility for database initialization. [534540d]
- [x] Task: Update `sql/migration.go` to ensure migrations also run with foreign keys if needed (though sqldef might handle it separately). [534540d]
- [x] Task: Verify the `store/cascade_test.go` and all other backend tests pass. [534540d]
- [x] Task: Conductor - User Manual Verification 'Phase 2' (Protocol in workflow.md) [4d2b420]

## Phase 3: Documentation & Audit
- [~] Task: Update `tech-stack.md` to reflect the actual SQLite driver being used (`modernc.org/sqlite`).
- [ ] Task: Perform a final audit of all `sql.Open` calls to ensure none were missed.
- [ ] Task: Conductor - User Manual Verification 'Phase 3' (Protocol in workflow.md)
