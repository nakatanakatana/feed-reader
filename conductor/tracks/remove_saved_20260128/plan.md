# Implementation Plan: Remove Saved Feature

This plan outlines the steps to completely remove the "Saved" feature from the database, backend, frontend, and documentation.

## Phase 1: Preparation and Documentation
- [x] Task: Update project documentation to remove "Saved" feature references. [7da6e87]
    - [ ] Remove from `conductor/product.md`.
    - [ ] Remove from `docs/feed_specification.md`.
- [ ] Task: Conductor - User Manual Verification 'Phase 1: Preparation and Documentation' (Protocol in workflow.md)

## Phase 2: Database Schema and Queries
- [ ] Task: Modify database schema to remove `is_saved` and `saved_at`.
    - [ ] Update `sql/schema.sql` to remove columns from `items` table and any relevant views.
    - [ ] Update `sql/query.sql` to remove references in SQL queries.
- [ ] Task: Regenerate code from SQL.
    - [ ] Run `sqlc generate`.
- [ ] Task: Fix backend store layer.
    - [ ] Update `store/` package to handle the removed fields.
    - [ ] Fix or remove tests in `store/` that rely on the "Saved" feature (e.g., `store/item_store_test.go`).
- [ ] Task: Verify database changes.
    - [ ] Run `go test ./store/...`.
- [ ] Task: Conductor - User Manual Verification 'Phase 2: Database Schema and Queries' (Protocol in workflow.md)

## Phase 3: Backend API and Logic
- [ ] Task: Update Protobuf definitions.
    - [ ] Remove `is_saved` from `proto/item/v1/item.proto` (Item, ListItemsRequest, UpdateItemStatusRequest).
    - [ ] Run `buf generate`.
- [ ] Task: Update backend handler logic.
    - [ ] Remove "Saved" related logic in `cmd/feed-reader/item_handler.go`.
    - [ ] Update other handlers or services in `cmd/feed-reader/` as needed.
- [ ] Task: Fix backend tests.
    - [ ] Update or remove tests in `cmd/feed-reader/` that use the "Saved" feature.
- [ ] Task: Verify backend changes.
    - [ ] Run `go test ./cmd/feed-reader/...`.
- [ ] Task: Conductor - User Manual Verification 'Phase 3: Backend API and Logic' (Protocol in workflow.md)

## Phase 4: Frontend UI and Logic
- [ ] Task: Update frontend types and data fetching.
    - [ ] Update `frontend/src/lib/db.ts`, `frontend/src/lib/item-query.ts`, etc., to remove `isSaved`.
- [ ] Task: Remove "Saved" UI elements.
    - [ ] Remove star icons and actions from `frontend/src/components/ItemRow.tsx` and `frontend/src/components/ItemList.tsx`.
    - [ ] Remove filtering options from `frontend/src/components/ItemList.tsx` or related components.
- [ ] Task: Fix frontend tests.
    - [ ] Update Vitest tests (e.g., `frontend/src/components/ItemRow.test.tsx`, `frontend/src/lib/item-utils.test.ts`).
- [ ] Task: Verify frontend changes.
    - [ ] Run `npm run test` (or the project's frontend test command).
- [ ] Task: Conductor - User Manual Verification 'Phase 4: Frontend UI and Logic' (Protocol in workflow.md)

## Phase 5: Final Verification
- [ ] Task: Full system check.
    - [ ] Run `go fmt`.
    - [ ] Run `golangci-lint run`.
    - [ ] Run `go test ./...`.
    - [ ] Run `go build -o dist/ ./cmd/...`.
- [ ] Task: Conductor - User Manual Verification 'Phase 5: Final Verification' (Protocol in workflow.md)
