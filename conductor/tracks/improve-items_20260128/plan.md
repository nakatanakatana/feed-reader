# Implementation Plan: Improve Item List and Detail Modal

This plan covers the enhancement of the item list UI, fixing navigation in the detail modal, and adding standard modal interaction behaviors.

## Phase 1: Item List UI Enhancements & Filtering [checkpoint: 7f73091]
Improve the information density of the item list and implement the ability to toggle read items.

- [x] Task: Update `ItemRow` to display `created_at` and `description` 56ad0d4
    - [ ] Write tests for `ItemRow` to verify display of new metadata (date and description snippet).
    - [ ] Modify `ItemRow.tsx` to include the second line of information with appropriate styling.
- [x] Task: Implement "Show Read" toggle in `ItemList` header ffc1ba6
- [x] Task: Update filtering logic to support read items ffc1ba6
    - [ ] Write tests to verify that the list correctly filters items based on the "Show Read" state.
    - [ ] Modify the data fetching or filtering logic in `ItemList.tsx` (or relevant hooks) to handle the read status filter.
- [x] Task: Conductor - User Manual Verification 'Phase 1: Item List UI Enhancements & Filtering' (Protocol in workflow.md) 0c497ce

## Phase 2: Item Detail Modal Fixes and Improvements [checkpoint: cdbf2dc]
Fix the broken navigation and add standard dismissal interactions to the modal.

- [x] Task: Fix Next/Prev navigation in `ItemDetailModal` 16af0f1
    - [ ] Write tests to reproduce the navigation failure in `ItemDetailModal`.
    - [ ] Debug and fix the navigation logic within `ItemDetailModal.tsx` or its parent context.
    - [ ] Verify that Next/Prev buttons correctly cycle through the current filtered list.
- [x] Task: Implement Backdrop and ESC key dismissal for `ItemDetailModal` 6b94060
    - [ ] Write tests to verify modal closes on ESC key and backdrop click.
    - [ ] Implement event listeners for the Escape key in `ItemDetailModal.tsx`.
    - [ ] Add backdrop click handler to the modal overlay.
- [x] Task: Conductor - User Manual Verification 'Phase 2: Item Detail Modal Fixes and Improvements' (Protocol in workflow.md) 5a8be57

## Phase 3: Final Verification and Cleanup
Ensure everything works together and meets the definition of done.

- [~] Task: End-to-End verification of all features
    - [ ] Verify responsive behavior on mobile/desktop.
    - [ ] Ensure no regressions in other item-related features.
- [x] Task: Conductor - User Manual Verification 'Phase 3: Final Verification and Cleanup' (Protocol in workflow.md) b6e5228
