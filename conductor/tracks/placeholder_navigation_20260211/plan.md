# Implementation Plan - Item Detail End-of-List Placeholder & Filter Preservation

This track implements a placeholder article at the end of the item list in the detail view to facilitate marking the last item as read and ensures that filters are preserved when closing the detail view.

## Phase 1: Filter Preservation on Close
Ensure that when a user closes the `ItemDetailModal`, they return to the list with their previous tag and date filters intact.

- [ ] Task: Update `ItemDetailRouteView` to preserve search parameters on close
    - [ ] Write a test in `frontend/src/components/ItemDetailRouteView.Navigation.test.tsx` to verify that closing the modal maintains `tagId` and `since` filters.
    - [ ] Update the `onClose` handler in `ItemDetailRouteView.tsx` to include `tagId` and `since` in the navigation call.
- [ ] Task: Conductor - User Manual Verification 'Filter Preservation on Close' (Protocol in workflow.md)

## Phase 2: Virtual "End-of-List" State
Introduce a virtual state to represent the end of the list within the `ItemDetailRouteView`.

- [ ] Task: Modify `ItemDetailRouteView` to support an "End of List" virtual item
    - [ ] Update `handleNext` in `ItemDetailRouteView.tsx` to transition to a virtual "end" state instead of doing nothing when at the last item.
    - [ ] Ensure that transitioning from the last real item to the "end" state marks the last item as read.
    - [ ] Update `handlePrev` to transition from the "end" state back to the last real item.
- [ ] Task: Update `ItemDetailModal` to render placeholder content
    - [ ] Update `ItemDetailModal.tsx` to accept a `isEndOfList` prop or handle a special `itemId` (e.g., `"end-of-list"`).
    - [ ] Implement the UI for the placeholder: "You've reached the end of the list" message and a "Back to List" button.
    - [ ] Disable the "Next" button and keyboard navigation when in the "End of List" state.
- [ ] Task: Conductor - User Manual Verification 'Virtual "End-of-List" State' (Protocol in workflow.md)

## Phase 3: Verification & Polish
Finalize the implementation and ensure all edge cases are covered.

- [ ] Task: Comprehensive Navigation Testing
    - [ ] Write integration tests for the full sequence: First Item -> ... -> Last Item -> Placeholder -> Close.
    - [ ] Verify keyboard navigation (j/k, l/h, arrows) works correctly with the placeholder.
- [ ] Task: Conductor - User Manual Verification 'Verification & Polish' (Protocol in workflow.md)
