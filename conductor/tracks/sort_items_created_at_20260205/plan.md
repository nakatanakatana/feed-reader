# Implementation Plan: Sort Items by Created Date

## Phase 1: Backend Implementation (Sorting Logic) [checkpoint: 7cb861c]
Modify the database queries and repository logic to sort items by `created_at` in ascending order.

- [x] Task: Update SQL queries for item retrieval to use `created_at ASC` instead of `published_at`. 64dee48
    - [ ] Modify `sql/query.sql` to update `ListItems` or equivalent queries.
    - [ ] Regenerate Go code using `make gen-sql` (sqlc).
- [x] Task: Ensure database indexes exist for `created_at` on the `items` table. 64dee48
    - [ ] Check `sql/schema.sql` and add index if missing.
- [x] Task: Implement/Update backend tests for item sorting. 64dee48
    - [ ] Write a test in `store/item_ordering_test.go` to verify `created_at ASC` sorting.
- [ ] Task: Conductor - User Manual Verification 'Phase 1: Backend Implementation' (Protocol in workflow.md)

## Phase 2: Frontend Implementation (UI/UX)
Update the item detail modal to display both dates and ensure the list reflects the sorting.

- [ ] Task: Update Item Detail Modal to display both `published_at` and `created_at`.
    - [ ] Modify `frontend/src/components/ItemDetailModal.tsx` to include both dates side-by-side.
    - [ ] Ensure proper labeling (e.g., "Published" and "Created").
- [ ] Task: Update frontend tests for the detail modal.
    - [ ] Update `frontend/src/components/ItemDetailModal.test.tsx` to verify both dates are rendered.
- [ ] Task: Verify item list sorting in the frontend.
    - [ ] Confirm `frontend/src/lib/item-query.ts` or relevant query logic correctly handles the sorted API response.
    - [ ] Update `frontend/src/components/ItemList.test.tsx` if it makes assumptions about sorting.
- [ ] Task: Conductor - User Manual Verification 'Phase 2: Frontend Implementation' (Protocol in workflow.md)
