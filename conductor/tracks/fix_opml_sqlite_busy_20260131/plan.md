# Implementation Plan - Fix SQLite Busy Error in OPML Import

## Phase 1: Database Schema & API Definition [checkpoint: 70e3923]
This phase focuses on defining the necessary data structures and API contracts.

- [x] Task: Create DB Schema for Import Jobs (5d81de8)
    - [ ] Create a migration file `sql/schema.sql` (or new migration) to add `import_jobs` table.
    - [ ] Define columns: `id`, `status`, `total_feeds`, `processed_feeds`, `failed_feeds` (JSON), `created_at`, `updated_at`.
    - [ ] Run `sqlc generate` to generate Go code for the new schema.
- [x] Task: Update Proto Definitions (5a94714)
    - [ ] Edit `proto/feed/v1/feed.proto`.
    - [ ] Add `job_id` to `ImportOpmlResponse`.
    - [ ] Add `GetImportJobRequest` and `GetImportJobResponse` messages.
    - [ ] Add `GetImportJob` RPC to `FeedService`.
    - [ ] Run `buf generate` (or project specific command) to regenerate Go and TypeScript code.
- [x] Task: Conductor - User Manual Verification 'Database Schema & API Definition' (Protocol in workflow.md) (70e3923)

## Phase 2: Import Job Service & Write Queue Integration
This phase implements the backend logic for managing jobs and integrating with the write queue.

- [x] Task: Implement Import Job Repository (35fd0a6)
    - [ ] Create tests for `CreateImportJob`, `UpdateImportJob`, `GetImportJob` in `store/import_job_test.go`.
    - [ ] Implement the store methods in `store/import_job.go` (or via `sqlc`).
- [ ] Task: Refactor OPML Import Logic (Async)
    - [ ] Create `cmd/feed-reader/opml_worker.go` (or similar) to handle background processing.
    - [ ] Implement `StartImportJob` function that:
        - Creates a job record in DB.
        - Parses OPML.
        - Updates `total_feeds`.
        - Iterates feeds and uses `write-queue` to create them.
        - Updates `processed_feeds` and status as it progresses.
- [ ] Task: Update Feed Handler
    - [ ] Update `ImportOpml` in `cmd/feed-reader/handler.go` to call `StartImportJob` and return the `job_id`.
    - [ ] Implement `GetImportJob` in `cmd/feed-reader/handler.go`.
- [ ] Task: Conductor - User Manual Verification 'Import Job Service & Write Queue Integration' (Protocol in workflow.md)

## Phase 3: Testing & Cleanup
- [ ] Task: Write Integration Tests
    - [ ] Create a test in `cmd/feed-reader/handler_test.go` or new integration test file.
    - [ ] Simulate a large OPML import.
    - [ ] Verify `job_id` is returned.
    - [ ] Poll `GetImportJob` to verify progress and completion.
    - [ ] Verify feeds are actually in the DB.
- [ ] Task: Conductor - User Manual Verification 'Testing & Cleanup' (Protocol in workflow.md)
