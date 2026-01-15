# Implementation Plan: Background Feed Fetcher & Item Storage

## Phase 1: Database Schema & Store Generation
- [x] Task: Create migration SQL for `items`, `feed_items`, and `item_reads` tables in `sql/schema.sql`. cc2cbbb
- [x] Task: Define `sqlc` queries in `sql/query.sql` for:
    - [x] Inserting/Upserting `items` (deduplication by URL).
    - [x] Linking items to feeds in `feed_items`.
    - [x] Initializing/Managing `item_reads`.
- [x] Task: Generate Go code using `sqlc` (`sqlc generate`). 4b193ee
- [ ] Task: Conductor - User Manual Verification 'Database Schema & Store Generation' (Protocol in workflow.md)

## Phase 2: Storage Layer Logic (TDD)
- [ ] Task: Implement atomic storage logic for saving fetched items.
    - [ ] Sub-task: Write tests in `store/` to verify URL deduplication and multi-table association.
    - [ ] Sub-task: Implement the logic in `store` package to pass the tests.
    - [ ] Sub-task: Verify >80% coverage for new store logic.
- [ ] Task: Conductor - User Manual Verification 'Storage Layer Logic' (Protocol in workflow.md)

## Phase 3: Background Fetcher & Worker Pool (TDD)
- [ ] Task: Implement the background worker pool.
    - [ ] Sub-task: Write tests for the worker pool (concurrency limit, error handling).
    - [ ] Sub-task: Implement the worker pool logic to pass the tests.
- [ ] Task: Implement the periodic scheduler (Ticker).
    - [ ] Sub-task: Write tests for the scheduler (ensuring it triggers at intervals).
    - [ ] Sub-task: Implement the scheduler in `cmd/feed-reader/fetcher.go`.
- [ ] Task: Conductor - User Manual Verification 'Background Fetcher & Worker Pool' (Protocol in workflow.md)

## Phase 4: Main Integration & E2E Verification
- [ ] Task: Wire up the background fetcher in `cmd/feed-reader/main.go`.
- [ ] Task: Add logging and observability for the fetcher process.
- [ ] Task: Final E2E manual verification of periodic fetching and database storage.
- [ ] Task: Conductor - User Manual Verification 'Main Integration & E2E Verification' (Protocol in workflow.md)