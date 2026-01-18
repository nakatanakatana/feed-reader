# Implementation Plan - Item Delivery API

## Phase 1: API Contract & Database Schema [checkpoint: 63bb619]
- [x] Task: Define Protocol Buffer Messages and Services f419a42
    - [x] Update `proto/feed/v1/feed.proto` to include `Item` message definition.
    - [x] Add `ListGlobalItems`, `ListFeedItems`, `GetItem`, `MarkItemRead` RPC definitions to `FeedService`.
    - [x] Define request/response messages for new RPCs including pagination fields (`page_token`, `page_size`, `next_page_token`) and filter fields (`is_read`).
    - [x] Run `buf generate` to generate Go and TypeScript code.
- [x] Task: Define Database Queries 7e52c7c
    - [x] Update `sql/query.sql` to add `ListGlobalItems` query (JOIN items, feed_items, item_reads; Order by published_at DESC; Limit/Offset or Cursor).
    - [x] Add `ListFeedItems` query (Filter by feed_id).
    - [x] Add `GetItem` query.
    - [x] Add `CreateItemRead` / `UpdateItemRead` queries to manage read status.
    - [x] Run `sqlc generate` to update Go database code.
- [x] Task: Conductor - User Manual Verification 'API Contract & Database Schema' (Protocol in workflow.md) 63bb619

## Phase 2: Backend Implementation [checkpoint: 6b2123c]
- [x] Task: Implement Read Status Management cc701b2
    - [x] Create test `cmd/feed-reader/handler_item_read_test.go` for `MarkItemRead` (Red).
    - [x] Implement `MarkItemRead` logic in `cmd/feed-reader/handler.go` (Green).
    - [x] Refactor and verify tests.
- [x] Task: Implement Get Item Detail 0bf06e0
    - [x] Create test `cmd/feed-reader/handler_item_get_test.go` for `GetItem` (Red).
    - [x] Implement `GetItem` logic (Green).
    - [x] Refactor and verify tests.
- [x] Task: Implement Feed Specific Item List 0bf06e0
    - [x] Create test `cmd/feed-reader/handler_item_list_feed_test.go` for `ListFeedItems` with pagination (Red).
    - [x] Implement `ListFeedItems` logic using cursor pagination (Green).
    - [x] Refactor and verify tests.
- [x] Task: Implement Global Timeline 0bf06e0
    - [x] Create test `cmd/feed-reader/handler_item_list_global_test.go` for `ListGlobalItems` (Red).
    - [x] Implement `ListGlobalItems` logic (Green).
    - [x] Refactor and verify tests.
- [x] Task: Conductor - User Manual Verification 'Backend Implementation' (Protocol in workflow.md) 6b2123c

## Phase 3: Frontend Implementation [checkpoint: 83a2515]
- [x] Task: Setup Frontend Data Layer 73e3b29
    - [x] Verify generated TypeScript client availability in `frontend/src/gen`.
    - [x] Add new query hooks in `frontend/src/lib/items.ts` for items (using `createInfiniteQuery` for pagination).
- [x] Task: Implement UI Components 73e3b29
    - [x] Create `frontend/src/components/ItemCard.tsx` to display individual item summary and image.
    - [x] Create `frontend/src/components/ItemDetail.tsx` (or Modal) for full content view.
    - [x] Create `frontend/src/components/FeedTimeline.tsx` for the global list.
- [x] Task: Integrate Features 73e3b29
    - [x] Update `frontend/src/routes/feeds.tsx` to show items when a feed is selected.
    - [x] Create new route/view `frontend/src/routes/timeline.tsx` (or index) for Global Timeline.
    - [x] Wire up "Mark as Read" button/action in the UI.
- [x] Task: Conductor - User Manual Verification 'Frontend Implementation' (Protocol in workflow.md) 83a2515
