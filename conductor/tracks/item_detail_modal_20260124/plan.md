# Implementation Plan: Item Detail Modal

This plan covers the end-to-end implementation of the Item Detail Modal, including schema extensions for the author field and frontend navigation logic.

## Phase 1: Backend & Protocol Extension
Extend the data model to include the `author` field and update the backend to support it.

- [x] Task: Update `proto/item/v1/item.proto` to add `author` field to `Item` message 26c8638
- [x] Task: Run `buf generate` to update generated code 55a9188
- [x] Task: Update database schema in `sql/schema.sql` to add `author` column to `items` table 385a2a7
- [x] Task: Update `sql/query.sql` to include `author` in select and insert queries 8b6da25
- [x] Task: Run `sqlc generate` to update Go database code 682f7b6
- [ ] Task: Update `store/item_store.go` and related Go code to handle the new `author` field
- [ ] Task: Update `cmd/feed-reader/item_handler.go` to map the `author` field in the API response
- [ ] Task: Write and run tests for `ItemStore` to verify `author` field persistence
- [ ] Task: Write and run tests for `ItemService` to verify `author` field in API response
- [ ] Task: Conductor - User Manual Verification 'Phase 1: Backend & Protocol Extension' (Protocol in workflow.md)

## Phase 2: Frontend Infrastructure & Basic Modal
Prepare the frontend to handle the new field and create the basic modal structure.

- [ ] Task: Run `npm run gen` (or equivalent) to regenerate Connect RPC web clients from updated proto
- [ ] Task: Create `frontend/src/components/ItemDetailModal.tsx` with basic layout (Title, Date, Author, Body)
- [ ] Task: Implement HTML rendering for the article body in the modal
- [ ] Task: Add "Open in new tab" link to the original article
- [ ] Task: Implement Read/Unread toggle logic in the modal using TanStack Query mutations
- [ ] Task: Write unit tests for `ItemDetailModal` (rendering and status toggle)
- [ ] Task: Conductor - User Manual Verification 'Phase 2: Frontend Infrastructure & Basic Modal' (Protocol in workflow.md)

## Phase 3: Navigation & List Integration
Implement the navigation logic between items and integrate the modal into the list view.

- [ ] Task: Implement navigation logic to find "Previous" and "Next" item IDs based on the current list state
- [ ] Task: Add "Previous" and "Next" buttons to `ItemDetailModal` and hook up navigation
- [ ] Task: Integrate `ItemDetailModal` into `frontend/src/components/ItemList.tsx`
- [ ] Task: Update `ItemRow` to trigger the modal on click
- [ ] Task: Add keyboard shortcuts (Esc to close, J/K or Arrows for navigation)
- [ ] Task: Write integration tests for item navigation within the modal
- [ ] Task: Verify responsive design for the modal on mobile viewport
- [ ] Task: Conductor - User Manual Verification 'Phase 3: Navigation & List Integration' (Protocol in workflow.md)
