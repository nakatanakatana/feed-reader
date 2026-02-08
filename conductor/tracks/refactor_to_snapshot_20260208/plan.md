# Implementation Plan: Refactor Existing Tests to Snapshot Testing

## Phase 1: Backend Structural Data Refactoring [checkpoint: b08c819]
- [x] Task: Migrate OPML tests to golden testing 9395d7e
    - Refactor `opml_test.go` to use `golden.Assert` for XML export/import.
    - Refactor `opml_importer_test.go` to use golden files for result verification.
- [x] Task: Migrate DB query tests to golden testing a56ce21
    - Refactor `store/queries_test.go` to use `golden.Assert`.
    - Implement JSON masking for dynamic fields in store results if necessary.
- [x] Task: Conductor - User Manual Verification 'Phase 1: Backend Structural Data Refactoring' b08c819

## Phase 2: Frontend Rendering Refactoring [checkpoint: c1e0cc8]
- [x] Task: Migrate Markdown rendering tests to snapshots ae7a9fd
    - Refactor `MarkdownRenderer.test.tsx` to use `toMatchSnapshot()`.
- [x] Task: Migrate complex UI components to snapshots 8f4dd52
    - Add `toMatchSnapshot()` to `ItemDetailModal.test.tsx`.
    - Add `toMatchSnapshot()` to `ItemList.test.tsx`.
- [x] Task: Conductor - User Manual Verification 'Phase 2: Frontend Rendering Refactoring' c1e0cc8

## Phase 3: Final Integration & API Verification [checkpoint: dbd80e1]
- [x] Task: Migrate API routing tests to snapshots 9f99ad0
    - Refactor `cmd/feed-reader/item_routing_test.go` to use `protojson` snapshots.
- [x] Task: Final full test suite run and verification 66ef8b5
    - Execute `make test-backend` and `make test-frontend`.
- [x] Task: Conductor - User Manual Verification 'Phase 3: Final Integration & API Verification' dbd80e1
