# Implementation Plan: Refactor Existing Tests to Snapshot Testing

## Phase 1: Backend Structural Data Refactoring
- [ ] Task: Migrate OPML tests to golden testing
    - Refactor `opml_test.go` to use `golden.Assert` for XML export/import.
    - Refactor `opml_importer_test.go` to use golden files for result verification.
- [ ] Task: Migrate DB query tests to golden testing
    - Refactor `store/queries_test.go` to use `golden.Assert`.
    - Implement JSON masking for dynamic fields in store results if necessary.
- [ ] Task: Conductor - User Manual Verification 'Phase 1: Backend Structural Data Refactoring'

## Phase 2: Frontend Rendering Refactoring
- [ ] Task: Migrate Markdown rendering tests to snapshots
    - Refactor `MarkdownRenderer.test.tsx` to use `toMatchSnapshot()`.
- [ ] Task: Migrate complex UI components to snapshots
    - Add `toMatchSnapshot()` to `ItemDetailModal.test.tsx`.
    - Add `toMatchSnapshot()` to `ItemList.test.tsx`.
- [ ] Task: Conductor - User Manual Verification 'Phase 2: Frontend Rendering Refactoring'

## Phase 3: Final Integration & API Verification
- [ ] Task: Migrate API routing tests to snapshots
    - Refactor `cmd/feed-reader/item_routing_test.go` to use `protojson` snapshots.
- [ ] Task: Final full test suite run and verification
    - Execute `make test-backend` and `make test-frontend`.
- [ ] Task: Conductor - User Manual Verification 'Phase 3: Final Integration & API Verification'
