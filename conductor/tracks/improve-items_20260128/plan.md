# Implementation Plan - Item List and Detail Modal Improvements

## Phase 1: Backend Data & API Enhancements
- [x] Task: Database Migration 552727c
    - [ ] Update `sql/schema.sql` to add `content`, `image_url`, and `categories` columns to `items` table.
    - [ ] Update `sql/query.sql` to include new columns in `CreateItem`, `GetItem`, `ListItems`, `ListItemsAsc`, `ListItemsByFeed`.
    - [ ] Add `CountUnreadItemsPerFeed` query to `sql/query.sql` to aggregate unread counts.
    - [ ] Run `sqlc generate` to regenerate Go code.
- [x] Task: Protobuf Definition Updates 27397fc
    - [ ] Update `proto/item/v1/item.proto` to include `content`, `image_url`, and `categories` in `Item` message.
    - [ ] Update `proto/feed/v1/feed.proto` to include `unread_count` in `Feed` message.
    - [ ] Run `buf generate` to regenerate Go and TypeScript code.
- [ ] Task: Fetcher Service Update
    - [ ] Update `cmd/feed-reader/fetcher_service.go` to map `gofeed.Item.Content`, `Image`, and `Categories` to the `Item` struct when saving.
- [ ] Task: Item Handler Update
    - [ ] Update `cmd/feed-reader/item_handler.go` to ensure new fields are passed in responses.
- [ ] Task: Feed Handler Update (Unread Counts)
    - [ ] Update `cmd/feed-reader/handler.go` (`ListFeeds`) to execute `CountUnreadItemsPerFeed`.
    - [ ] Map the results to the `unread_count` field in the `ListFeedsResponse`.
- [ ] Task: Conductor - User Manual Verification 'Backend Data & API Enhancements' (Protocol in workflow.md)

## Phase 2: Frontend List & Unread Counts
- [ ] Task: Display Unread Counts
    - [ ] Update `frontend/src/components/FeedList.tsx` to display the `unread_count` for each feed.
    - [ ] Implement a "Total Unread" counter in the sidebar/header.
- [ ] Task: Default Sort & Filter
    - [ ] Update `frontend/src/lib/item-query.ts` or `frontend/src/components/ItemList.tsx` to set default `is_read` to `false` and `sort_order` to `ASC` (Oldest First).
- [ ] Task: Conductor - User Manual Verification 'Frontend List & Unread Counts' (Protocol in workflow.md)

## Phase 3: Frontend Detail Modal & Navigation
- [ ] Task: Modal UI Updates
    - [ ] Update `frontend/src/components/ItemDetailModal.tsx` to make the title a link to `item.url`.
    - [ ] Remove the "Open Original Article" button.
    - [ ] Display `content` (as HTML), `image_url`, and `categories` if available.
- [ ] Task: Seamless Navigation Logic
    - [ ] Update `frontend/src/components/ItemDetailModal.tsx` and `frontend/src/routes/_items.items.$itemId.tsx` (or relevant route) to handle "Next" logic.
    - [ ] Implement logic: When "Next" is clicked and no items are left in the current list, trigger a fetch for the next page of unread items.
    - [ ] Ensure that marking as read in the modal updates the background list state (React Query invalidation or cache update).
- [ ] Task: Conductor - User Manual Verification 'Frontend Detail Modal & Navigation' (Protocol in workflow.md)
