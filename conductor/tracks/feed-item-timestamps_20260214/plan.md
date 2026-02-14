# Implementation Plan - Per-Feed Timestamps

## Phase 1: Database & Backend Logic [checkpoint: bbacfc8]
- [x] Task: Create database migration d6772f5
    - [ ] Create a new SQL migration file to add `published_at` column to `feed_items` table.
    - [ ] Run `sqlc generate` to update Go models.
- [x] Task: Update Feed Fetcher Logic (TDD) c198b1f
    - [ ] Create/Update test in `feed_store_test.go` or `fetcher_test.go` to verify `published_at` is saved to `feed_items`.
    - [ ] Implement logic in `FeedStore` (or wherever `feed_items` are inserted/updated) to save the `published_at` timestamp.
    - [ ] Verify `items.published_at` remains unchanged on subsequent updates (if that's the established behavior) while `feed_items.published_at` is updated.
- [x] Task: Conductor - User Manual Verification 'Database & Backend Logic' (Protocol in workflow.md)

## Phase 2: API Implementation (RPC) [checkpoint: 05e9f40]
- [x] Task: Define RPC Protobuf d6e04da
    - [x] Update `proto/item/v1/item_service.proto` (check exact path) to add `GetItemFeeds` method and messages.
    - [x] Run `buf generate` to create Go and TypeScript code.
- [x] Task: Implement RPC Method (TDD) d6e04da
    - [x] Create test in `item_service_test.go` for `GetItemFeeds`.
    - [x] Implement `GetItemFeeds` in `ItemService`.
    - [x] Ensure it queries `feed_items` joining with `feeds` to get titles and timestamps.
- [ ] Task: Conductor - User Manual Verification 'API Implementation (RPC)' (Protocol in workflow.md)

## Phase 3: Frontend Implementation
- [ ] Task: Update Frontend Client
    - [ ] Ensure `buf generate` (from Phase 2) updated the frontend client code in `frontend/gen` or similar.
- [ ] Task: Implement Tooltip UI (TDD/Component Test)
    - [ ] Create a new component or update `ItemDetailModal` to include the tooltip logic.
    - [ ] Write a test (Vitest/Testing Library) for the hover interaction and data fetching (mocking the RPC response).
    - [ ] Implement the hover state, API call (using TanStack Query), and Tooltip UI.
    - [ ] Display `feed_title`, `published_at`, and `created_at` in the tooltip.
- [ ] Task: Conductor - User Manual Verification 'Frontend Implementation' (Protocol in workflow.md)
