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

## Phase 2: Backend Logic Updates [checkpoint: 6795819]
- [x] Task: Update Fetcher Service Logic aee5d55
    - [x] Modify `FetchAllFeeds` (or equivalent polling function) to query based on `next_fetch <= NOW`.
    - [x] Update the post-fetch logic to calculate and save the new `next_fetch` (`now + FetchInterval`).
    - [x] Ensure initial feed addition sets a valid `next_fetch`.
    - [x] Write unit tests for scheduling logic.
- [x] Task: Implement API for Manual Scheduling 1617515
    - [x] Define Proto RPC `SetFeedSchedule` (or similar) accepting feed IDs and a timestamp (or duration).
    - [x] Implement the RPC handler to update `next_fetch` in the DB.
    - [x] Write integration tests for the API.
- [x] Task: Conductor - User Manual Verification 'Phase 2' (Protocol in workflow.md) df387cb

## Phase 3: Frontend Implementation [checkpoint: 4dd0e3d]
- [x] Task: Update Frontend Client & Types 622c107
    - [x] Regenerate API client (Buf/Connect) to include new RPCs.
    - [x] Update frontend models to reflect the schema change (if necessary for display).
- [x] Task: Implement Suspend UI 631fb49
    - [x] Update `FeedList` context menu with "Suspend Fetching" options (1 Day, 3 Days, 1 Week, 1 Month).
    - [x] Update `BulkActionBar` to include "Suspend" operation for multiple selections.
    - [x] Implement the logic to call the `SetFeedSchedule` API.
    - [x] Add visual feedback (toast/notification) upon success.
    - [x] Write component tests for the new UI actions.
- [x] Task: Conductor - User Manual Verification 'Phase 3' (Protocol in workflow.md) 71d8e55

## Phase 4: Verification & Cleanup
- [x] Task: Verify Migration on clean and existing DBs. 81514a2
- [x] Task: Verify Polling respects the schedule. 01e7bd4
- [ ] Task: Conductor - User Manual Verification 'Phase 4' (Protocol in workflow.md)
