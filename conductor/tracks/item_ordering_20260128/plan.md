# Implementation Plan: Standardize Item Ordering and Display

## Phase 1: Backend Refactoring (Sorting Logic) [checkpoint: e422f70]
Modify the database queries to use the standardized sorting logic (`COALESCE(published_at, created_at) ASC`).

- [x] Task: Update `sql/query.sql` to implement `COALESCE` sorting in item listing queries. fa6431a
    - [x] Modify `ListItems`, `ListItemsByFeed`, etc., to include `ORDER BY COALESCE(published_at, created_at) ASC`. fa6431a
- [x] Task: Generate Go code from updated SQL using `sqlc`. fa6431a
    - [x] Run `make generate` (or equivalent) to update `store/query.sql.go`. fa6431a
- [x] Task: Update Store layer tests to verify the new sorting order. fa6431a
    - [x] Create/Update tests in `store/item_store_test.go` to ensure items are returned in the correct ascending order with fallback logic. fa6431a
- [x] Task: Conductor - User Manual Verification 'Phase 1: Backend Refactoring' (Protocol in workflow.md) e422f70

## Phase 2: Frontend Implementation (Display Logic)
Update the UI components to display the correct date and label based on the availability of `published_at`.

- [ ] Task: Create a utility function for date display logic in `frontend/src/lib/item-utils.ts`.
    - [ ] Implement a function that returns the date string and its type (Published vs Received).
- [ ] Task: Update `ItemRow` component to use the new display logic.
    - [ ] Modify `frontend/src/components/ItemRow.tsx` to show the appropriate label.
- [ ] Task: Update `ItemDetailModal` component to reflect the same date display logic.
    - [ ] Modify `frontend/src/components/ItemDetailModal.tsx`.
- [ ] Task: Update frontend tests to verify label changes.
    - [ ] Update tests in `frontend/src/components/ItemRow.test.tsx` and `frontend/src/components/ItemDetailModal.test.tsx`.
- [ ] Task: Conductor - User Manual Verification 'Phase 2: Frontend Implementation' (Protocol in workflow.md)
