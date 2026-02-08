# Implementation Plan: Refactor Existing Tests to Snapshot Testing

## Phase 1: Backend Structural Data Refactoring [checkpoint: b08c819]
- [x] Task: Migrate OPML tests to golden testing 9395d7e
    - Refactor `opml_test.go` to use `golden.Assert` for XML export/import.
    - Refactor `opml_importer_test.go` to use golden files for result verification.
- [x] Task: Migrate DB query tests to golden testing a56ce21
    - Refactor `store/queries_test.go` to use `golden.Assert`.
    - Implement JSON masking for dynamic fields in store results if necessary.
- [x] Task: Conductor - User Manual Verification 'Phase 1: Backend Structural Data Refactoring' b08c819

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
