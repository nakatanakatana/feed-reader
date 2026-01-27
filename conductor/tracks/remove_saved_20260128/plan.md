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

## Phase 3: Backend API and Logic [checkpoint: b8adc07]
- [x] Task: Update Protobuf definitions. [b317f6a]
- [x] Task: Update backend handler logic. [b317f6a]
- [x] Task: Fix backend tests. [b317f6a]
- [x] Task: Verify backend changes. [b317f6a]
- [x] Task: Conductor - User Manual Verification 'Phase 3: Backend API and Logic' (Protocol in workflow.md) [b8adc07]

## Phase 4: Frontend UI and Logic
- [x] Task: Update frontend types and data fetching. [5af6513]
- [~] Task: Remove "Saved" UI elements.
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
