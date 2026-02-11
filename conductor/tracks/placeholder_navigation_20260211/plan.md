# Implementation Plan - Item Detail End-of-List Placeholder & Filter Preservation

This track implements a placeholder article at the end of the item list in the detail view to facilitate marking the last item as read and ensures that filters are preserved when closing the detail view.

## Phase 1: Filter Preservation on Close [checkpoint: 1d14682]
Ensure that when a user closes the `ItemDetailModal`, they return to the list with their previous tag and date filters intact.

- [x] Task: Update `ItemDetailRouteView` to preserve search parameters on close [4e7b616]
    - [x] Write a test in `frontend/src/components/ItemDetailRouteView.Navigation.test.tsx` to verify that closing the modal maintains `tagId` and `since` filters.
    - [x] Update the `onClose` handler in `ItemDetailRouteView.tsx` to include `tagId` and `since` in the navigation call.
- [x] Task: Conductor - User Manual Verification 'Filter Preservation on Close' (Protocol in workflow.md) [1d14682]

## Phase 2: Virtual "End-of-List" State [checkpoint: ff333ce]
Introduce a virtual state to represent the end of the list within the `ItemDetailRouteView`.

- [x] Task: Modify `ItemDetailRouteView` to support an "End of List" virtual item [2bff9b5]
    - [x] Update `handleNext` in `ItemDetailRouteView.tsx` to transition to a virtual "end" state instead of doing nothing when at the last item.
    - [x] Ensure that transitioning from the last real item to the "end" state marks the last item as read.
    - [x] Update `handlePrev` to transition from the "end" state back to the last real item.
- [x] Task: Update `ItemDetailModal` to render placeholder content [2bff9b5]
    - [x] Update `ItemDetailModal.tsx` to accept a `isEndOfList` prop or handle a special `itemId` (e.g., `"end-of-list"`).
    - [x] Implement the UI for the placeholder: "You've reached the end of the list" message and a "Back to List" button.
    - [x] Disable the "Next" button and keyboard navigation when in the "End of List" state.
- [x] Task: Conductor - User Manual Verification 'Virtual "End-of-List" State' (Protocol in workflow.md) [ff333ce]

## Phase 3: Verification & Polish [checkpoint: 9c960ad]
Finalize the implementation and ensure all edge cases are covered.

- [x] Task: Comprehensive Navigation Testing [9c960ad]
    - [x] Write integration tests for the full sequence: First Item -> ... -> Last Item -> Placeholder -> Close.
    - [x] Verify keyboard navigation (j/k, l/h, arrows) works correctly with the placeholder.
- [x] Task: Conductor - User Manual Verification 'Verification & Polish' (Protocol in workflow.md) [9c960ad]
