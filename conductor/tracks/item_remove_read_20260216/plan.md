# Implementation Plan - Transient Removal of Read Items

This plan covers the implementation of a "Clear Read Items" button that temporarily removes read items matching current filters from the frontend state.

## Phase 1: Frontend Implementation

### Task: Prepare Testing Environment
- [ ] Task: Create integration test to verify the "Clear Read Items" logic
    - [ ] Setup a mock state with both read and unread items
    - [ ] Define a test case where clicking the button removes only read items in the current filter
    - [ ] Verify that unread items remain
    - [ ] Verify that no API calls are made

### Task: UI Implementation
- [ ] Task: Add "Clear Read Items" button to the Toolbar
    - [ ] Update `frontend/src/components/HeaderRefinement.tsx` (or appropriate toolbar component) to include the new button
    - [ ] Style the button according to project conventions (Panda CSS)
    - [ ] Add tooltips/aria-labels for accessibility

### Task: Logic Implementation
- [ ] Task: Implement the removal logic in the store/data layer
    - [ ] Create a function to filter out `isRead: true` items from the active TanStack DB or SolidJS Store collection
    - [ ] Ensure the operation is reactive so the UI updates immediately
    - [ ] Verify that the state change is memory-only

### Task: Verification
- [ ] Task: Run frontend tests and verify functionality
    - [ ] Run `npm test` or specific Vitest command
    - [ ] Achieve >80% coverage for the new logic

- [ ] Task: Conductor - User Manual Verification 'Phase 1: Frontend Implementation' (Protocol in workflow.md)
