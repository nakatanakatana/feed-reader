# Implementation Plan - Item List and Detail Modal Improvements

## Phase 1: Backend Data & API Enhancements [checkpoint: 3a77154]
- [x] Task: Database Migration 552727c
- [x] Task: Protobuf Definition Updates 27397fc
- [x] Task: Fetcher Service Update e7bd20e
- [x] Task: Item Handler Update 6383a0e
- [x] Task: Feed Handler Update (Unread Counts) 48feaac
- [x] Task: Conductor - User Manual Verification 'Backend Data & API Enhancements' (Protocol in workflow.md) 3a77154

## Phase 2: Frontend List & Unread Counts
- [x] Task: Display Unread Counts d2ea06c
    - [x] Update `frontend/src/components/FeedList.tsx` to display the `unread_count` for each feed.
    - [x] Implement a "Total Unread" counter in the sidebar/header.
- [x] Task: Default Sort & Filter d2ea06c
    - [x] Update `frontend/src/lib/item-query.ts` or `frontend/src/components/ItemList.tsx` to set default `is_read` to `false` and `sort_order` to `ASC` (Oldest First).
- [~] Task: Conductor - User Manual Verification 'Frontend List & Unread Counts' (Protocol in workflow.md)

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
