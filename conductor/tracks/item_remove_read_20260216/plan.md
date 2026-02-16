# Implementation Plan - Transient Removal of Read Items

This plan covers the implementation of a "Clear Read Items" button that temporarily removes read items matching current filters from the frontend state.

## Phase 1: Frontend Implementation

### Task: Prepare Testing Environment
- [x] Task: Create integration test to verify the "Clear Read Items" logic [342252e]
    - [x] Setup a mock state with both read and unread items
    - [x] Define a test case where clicking the button removes only read items in the current filter
    - [x] Verify that unread items remain
    - [x] Verify that no API calls are made

### Task: UI Implementation
- [x] Task: Add "Clear Read Items" button to the Toolbar [342252e]
    - [x] Update `frontend/src/components/HeaderRefinement.tsx` (or appropriate toolbar component) to include the new button
    - [x] Style the button according to project conventions (Panda CSS)
    - [x] Add tooltips/aria-labels for accessibility

### Task: Logic Implementation
- [x] Task: Implement the removal logic in the store/data layer [342252e]
    - [x] Create a function to filter out `isRead: true` items from the active TanStack DB or SolidJS Store collection
    - [x] Ensure the operation is reactive so the UI updates immediately
    - [x] Verify that the state change is memory-only

### Task: Verification
- [x] Task: Run frontend tests and verify functionality [342252e]
    - [x] Run `npm test` or specific Vitest command
    - [x] Achieve >80% coverage for the new logic

- [ ] Task: Conductor - User Manual Verification 'Phase 1: Frontend Implementation' (Protocol in workflow.md)
