# Implementation Plan: Filter Items by Date

Adding a date-based "since" filter to the item list, falling back to `created_at` if `published_at` is missing.

## Phase 1: Backend Implementation

- [x] Task: Update Protobuf definition db776c3
    - [ ] Add `google.protobuf.Timestamp published_since` to `ListItemsRequest` in `proto/item/v1/item.proto`.
    - [ ] Run `make generate` (or equivalent) to update Go and TypeScript generated code.
- [ ] Task: Update SQL Queries (TDD)
    - [ ] Write a failing test in `store/item_store_test.go` that expects filtering by date.
    - [ ] Update `sql/query.sql` to include `AND (COALESCE(published_at, created_at) >= ?1 OR ?1 IS NULL)` logic in `ListItems` and `ListItemsAsc`.
    - [ ] Run `sqlc generate` to update `store/query.sql.go`.
    - [ ] Implement the storage logic to pass the tests.
- [ ] Task: Update Backend Handler (TDD)
    - [ ] Write a failing test in `cmd/feed-reader/item_handler_test.go`.
    - [ ] Update `cmd/feed-reader/item_handler.go` to pass the `published_since` from the request to the storage layer.
    - [ ] Verify all backend tests pass.
- [ ] Task: Conductor - User Manual Verification 'Backend Implementation' (Protocol in workflow.md)

## Phase 2: Frontend Implementation

- [ ] Task: Update API Mocks
    - [ ] Update `frontend/src/mocks/handlers.ts` to handle the `publishedSince` parameter in the `listItems` mock.
- [ ] Task: Update Data Fetching Logic (TDD)
    - [ ] Write failing tests in `frontend/src/lib/item-query.test.ts`.
    - [ ] Update `frontend/src/lib/item-query.ts` to include `publishedSince` in the request.
- [ ] Task: Create Date Filter UI Component (TDD)
    - [ ] Write failing tests for a new `DateFilterSelector` component (or similar).
    - [ ] Implement the component with presets: All Time, Past 24h, 7d, 30d.
- [ ] Task: Integrate Date Filter into ItemList (TDD)
    - [ ] Write failing integration tests in `frontend/src/components/ItemList.test.tsx`.
    - [ ] Update `ItemList.tsx` to include the date filter in the view and pass it to the query hook.
- [ ] Task: Conductor - User Manual Verification 'Frontend Implementation' (Protocol in workflow.md)
