# Implementation Plan - Per-Feed Timestamps

## Phase 1: Database & Backend Logic
- [x] Task: Create database migration d6772f5
    - [ ] Create a new SQL migration file to add `published_at` column to `feed_items` table.
    - [ ] Run `sqlc generate` to update Go models.
- [ ] Task: Update Feed Fetcher Logic (TDD)
    - [ ] Create/Update test in `feed_store_test.go` or `fetcher_test.go` to verify `published_at` is saved to `feed_items`.
    - [ ] Implement logic in `FeedStore` (or wherever `feed_items` are inserted/updated) to save the `published_at` timestamp.
    - [ ] Verify `items.published_at` remains unchanged on subsequent updates (if that's the established behavior) while `feed_items.published_at` is updated.
- [ ] Task: Conductor - User Manual Verification 'Database & Backend Logic' (Protocol in workflow.md)

## Phase 2: API Implementation (RPC)
- [ ] Task: Define RPC Protobuf
    - [ ] Update `proto/item/v1/item_service.proto` (check exact path) to add `GetItemFeeds` method and messages.
    - [ ] Run `buf generate` to create Go and TypeScript code.
- [ ] Task: Implement RPC Method (TDD)
    - [ ] Create test in `item_service_test.go` for `GetItemFeeds`.
    - [ ] Implement `GetItemFeeds` in `ItemService`.
    - [ ] Ensure it queries `feed_items` joining with `feeds` to get titles and timestamps.
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
