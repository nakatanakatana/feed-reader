# Implementation Plan: Fix Item Author Saving

This plan follows the TDD-centric workflow to ensure the author's name is correctly extracted from feeds, saved to the database, and displayed in the UI.

## Phase 1: Backend - Item Author Extraction and Storage [checkpoint: 2f46557]
Focus on the logic that converts `gofeed.Item` to the internal database model.

- [x] Task: Research existing item creation flow in `cmd/feed-reader/write_queue.go` and `store/` f5cae78
- [x] Task: Write failing test in `cmd/feed-reader/` to verify `author` extraction from `gofeed.Item` f5cae78
- [x] Task: Implement author extraction logic in `cmd/feed-reader/` and ensure tests pass f5cae78
- [x] Task: Verify end-to-end storage by fetching a mock feed in an integration test f5cae78
- [x] Task: Conductor - User Manual Verification 'Phase 1: Backend' (Protocol in workflow.md)

## Phase 2: Frontend - Display Item Author [checkpoint: 5f89cf9]
Focus on rendering the `author` field in the item detail view.

- [x] Task: Research `frontend/src/components/ItemDetailModal.tsx` and its test file
- [x] Task: Write failing test in `frontend/src/components/ItemDetailModal.test.tsx` to verify author rendering
- [x] Task: Update `ItemDetailModal.tsx` to display the author name and ensure tests pass
- [x] Task: Verify visual integration and responsive behavior on mobile/desktop
- [x] Task: Conductor - User Manual Verification 'Phase 2: Frontend' (Protocol in workflow.md)

## Phase 3: Final Validation and Cleanup [checkpoint: 013c717]
Ensure everything works together and meets the quality gates.

- [x] Task: Perform end-to-end manual verification with a real or simulated feed fetch
- [x] Task: Verify code coverage (>80%) and linting for all modified files
- [x] Task: Conductor - User Manual Verification 'Phase 3: Final' (Protocol in workflow.md)
