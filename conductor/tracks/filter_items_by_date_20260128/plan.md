# Implementation Plan: Filter Items by Date

Adding a date-based "since" filter to the item list, falling back to `created_at` if `published_at` is missing.

## Phase 1: Backend Implementation [checkpoint: 76c0828]

- [x] Task: Update Protobuf definition db776c3
    - [ ] Add `google.protobuf.Timestamp published_since` to `ListItemsRequest` in `proto/item/v1/item.proto`.
    - [ ] Run `make generate` (or equivalent) to update Go and TypeScript generated code.
- [x] Task: Update SQL Queries (TDD) d4d1352
    - [ ] Write a failing test in `store/item_store_test.go` that expects filtering by date.
    - [ ] Update `sql/query.sql` to include `AND (COALESCE(published_at, created_at) >= ?1 OR ?1 IS NULL)` logic in `ListItems` and `ListItemsAsc`.
    - [ ] Run `sqlc generate` to update `store/query.sql.go`.
    - [ ] Implement the storage logic to pass the tests.
- [x] Task: Update Backend Handler (TDD) fe51b6d
    - [ ] Write a failing test in `cmd/feed-reader/item_handler_test.go`.
    - [ ] Update `cmd/feed-reader/item_handler.go` to pass the `published_since` from the request to the storage layer.
    - [ ] Verify all backend tests pass.
- [ ] Task: Conductor - User Manual Verification 'Backend Implementation' (Protocol in workflow.md)

## Phase 2: Frontend Implementation [checkpoint: 5ed7245]

- [x] Task: Update API Mocks c5840a4
    - [x] Update `frontend/src/mocks/handlers.ts` to handle the `publishedSince` parameter in the `listItems` mock.
- [x] Task: Update Data Fetching Logic (TDD) a4b2539
    - [x] Write failing tests in `frontend/src/lib/item-query.test.ts`.
    - [x] Update `frontend/src/lib/item-query.ts` to include `publishedSince` in the request.
- [x] Task: Create Date Filter UI Component (TDD) a7bc3eb
    - [x] Write failing tests for a new `DateFilterSelector` component (or similar).
    - [x] Implement the component with presets: All Time, Past 24h, 7d, 30d.
- [x] Task: Integrate Date Filter into ItemList (TDD) 8fa776e
    - [x] Write failing integration tests in `frontend/src/components/ItemList.test.tsx`.
    - [x] Update `ItemList.tsx` to include the date filter in the view and pass it to the query hook.
- [x] Task: Conductor - User Manual Verification 'Frontend Implementation' (Protocol in workflow.md)
