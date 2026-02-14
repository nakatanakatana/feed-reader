# Implementation Plan - Manual Feed Fetch Control

## Phase 1: Database Schema & Backend Migration [checkpoint: 46f78fd]
- [x] Task: Create SQL migration for schema changes f15f054
    - [x] Create `feed_fetcher` table (consolidating `feed_fetcher_cache`).
    - [x] Add `next_fetch` and move `last_fetched_at`.
    - [x] Migrate existing data from `feeds` and `feed_fetcher_cache`.
    - [x] Drop `last_fetched_at` from `feeds` (or ignore it).
    - [x] Update `query.sql` to reflect new schema.
    - [x] Run `sqlc generate` to update Go code.
- [x] Task: Update Backend Store Layer f15f054
    - [x] Update `FeedStore` methods to read/write `last_fetched_at` and `next_fetch` from the new table.
    - [x] Fix any broken references to `feeds.last_fetched_at` in the codebase.
    - [x] Write unit tests for the new store queries.
- [x] Task: Conductor - User Manual Verification 'Phase 1' (Protocol in workflow.md) b510f82

## Phase 2: Backend Logic Updates
- [x] Task: Update Fetcher Service Logic aee5d55
    - [x] Modify `FetchAllFeeds` (or equivalent polling function) to query based on `next_fetch <= NOW`.
    - [x] Update the post-fetch logic to calculate and save the new `next_fetch` (`now + FetchInterval`).
    - [x] Ensure initial feed addition sets a valid `next_fetch`.
    - [x] Write unit tests for scheduling logic.
- [~] Task: Implement API for Manual Scheduling
    - [ ] Define Proto RPC `SetFeedSchedule` (or similar) accepting feed IDs and a timestamp (or duration).
    - [ ] Implement the RPC handler to update `next_fetch` in the DB.
    - [ ] Write integration tests for the API.
- [ ] Task: Conductor - User Manual Verification 'Phase 2' (Protocol in workflow.md)

## Phase 3: Frontend Implementation
- [ ] Task: Update Frontend Client & Types
    - [ ] Regenerate API client (Buf/Connect) to include new RPCs.
    - [ ] Update frontend models to reflect the schema change (if necessary for display).
- [ ] Task: Implement Suspend UI
    - [ ] Update `FeedList` context menu with "Suspend Fetching" options (1 Day, 3 Days, 1 Week, 1 Month).
    - [ ] Update `BulkActionBar` to include "Suspend" operation for multiple selections.
    - [ ] Implement the logic to call the `SetFeedSchedule` API.
    - [ ] Add visual feedback (toast/notification) upon success.
    - [ ] Write component tests for the new UI actions.
- [ ] Task: Conductor - User Manual Verification 'Phase 3' (Protocol in workflow.md)

## Phase 4: Verification & Cleanup
- [ ] Task: Verify Migration on clean and existing DBs.
- [ ] Task: Verify Polling respects the schedule.
- [ ] Task: Conductor - User Manual Verification 'Phase 4' (Protocol in workflow.md)
