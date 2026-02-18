# Implementation Plan: Fix Item Author Saving

This plan follows the TDD-centric workflow to ensure the author's name is correctly extracted from feeds, saved to the database, and displayed in the UI.

## Phase 1: Backend - Item Author Extraction and Storage
Focus on the logic that converts `gofeed.Item` to the internal database model.

- [ ] Task: Research existing item creation flow in `cmd/feed-reader/write_queue.go` and `store/`
- [ ] Task: Write failing test in `cmd/feed-reader/` to verify `author` extraction from `gofeed.Item`
- [ ] Task: Implement author extraction logic in `cmd/feed-reader/` and ensure tests pass
- [ ] Task: Verify end-to-end storage by fetching a mock feed in an integration test
- [ ] Task: Conductor - User Manual Verification 'Phase 1: Backend' (Protocol in workflow.md)

## Phase 2: Frontend - Display Item Author
Focus on rendering the `author` field in the item detail view.

- [ ] Task: Research `frontend/src/components/ItemDetailModal.tsx` and its test file
- [ ] Task: Write failing test in `frontend/src/components/ItemDetailModal.test.tsx` to verify author rendering
- [ ] Task: Update `ItemDetailModal.tsx` to display the author name and ensure tests pass
- [ ] Task: Verify visual integration and responsive behavior on mobile/desktop
- [ ] Task: Conductor - User Manual Verification 'Phase 2: Frontend' (Protocol in workflow.md)

## Phase 3: Final Validation and Cleanup
Ensure everything works together and meets the quality gates.

- [ ] Task: Perform end-to-end manual verification with a real or simulated feed fetch
- [ ] Task: Verify code coverage (>80%) and linting for all modified files
- [ ] Task: Conductor - User Manual Verification 'Phase 3: Final' (Protocol in workflow.md)
