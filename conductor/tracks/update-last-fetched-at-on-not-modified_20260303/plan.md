# Implementation Plan: Update last_fetched_at on Not Modified

## Phase 1: Red Phase - Write Failing Tests
- [x] Task: Create a new test in `cmd/feed-reader/fetcher_service_test.go` to verify that `FetchFeedsByIDsSync` updates `last_fetched_at` when the fetcher returns `ErrNotModified`. (9f3c1e5)
- [x] Task: Add a test case to ensure 404/500 errors do NOT update `last_fetched_at`. (9f3c1e5)
- [x] Task: Run tests and confirm they fail as expected. (9f3c1e5)
- [ ] Task: Conductor - User Manual Verification 'Phase 1: Red Phase' (Protocol in workflow.md)

## Phase 2: Green Phase - Implement Logic
- [ ] Task: Refactor `fetchAndSaveSync` in `cmd/feed-reader/fetcher_service.go` to update `last_fetched_at` and `next_fetch` even when `ErrNotModified` is encountered.
- [ ] Task: Run tests and confirm they pass.
- [ ] Task: Conductor - User Manual Verification 'Phase 2: Green Phase' (Protocol in workflow.md)

## Phase 3: Refactor and Consolidate
- [ ] Task: Extract the duplicated logic for updating `last_fetched_at` and `next_fetch` into a reusable private method `markFetched(ctx, feedID, items)` in `fetcher_service.go`.
- [ ] Task: Update both `FetchAndSave` and `fetchAndSaveSync` to use this new method.
- [ ] Task: Verify all tests still pass and coverage is maintained.
- [ ] Task: Conductor - User Manual Verification 'Phase 3: Refactor' (Protocol in workflow.md)
