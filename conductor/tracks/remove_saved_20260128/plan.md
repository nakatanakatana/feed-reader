# Implementation Plan: Remove Saved Feature

This plan outlines the steps to completely remove the "Saved" feature from the database, backend, frontend, and documentation.

## Phase 1: Preparation and Documentation [checkpoint: 38749ca]
- [x] Task: Update project documentation to remove "Saved" feature references. [7da6e87]
- [x] Task: Conductor - User Manual Verification 'Phase 1: Preparation and Documentation' (Protocol in workflow.md) [38749ca]

## Phase 2: Database Schema and Queries [checkpoint: 35686d8]
- [x] Task: Modify database schema to remove `is_saved` and `saved_at`. [b57a5e3]
- [x] Task: Regenerate code from SQL. [b57a5e3]
- [x] Task: Fix backend store layer. [b57a5e3]
- [x] Task: Verify database changes. [b57a5e3]
- [x] Task: Conductor - User Manual Verification 'Phase 2: Database Schema and Queries' (Protocol in workflow.md) [35686d8]

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
