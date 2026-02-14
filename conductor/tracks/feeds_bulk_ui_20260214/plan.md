# Implementation Plan: Feeds Bulk Operation UI Refinement

This plan outlines the steps to implement a "Select All" checkbox and a floating bulk action bar on the Feeds page, consistent with the Home page's UI.

## Phase 1: Preparation and Selection Logic
Focus on extending the state management to support "Select All" and ensuring the selection logic correctly handles filtered views.

- [x] Task: Extend `FeedList` component state to handle "Select All" logic. f06bb58
    - [x] Add a derived signal or memo to determine the "Select All" state (unselected, indeterminate, or selected) based on currently visible feeds.
    - [x] Implement a toggle function that selects or deselects all currently visible feeds.
- [x] Task: TDD - Unit tests for selection logic in `FeedList`. f06bb58
    - [x] Write tests to verify that "Select All" only affects visible feeds.
    - [x] Write tests to verify the indeterminate state calculation.
- [ ] Task: Conductor - User Manual Verification 'Phase 1: Preparation and Selection Logic' (Protocol in workflow.md)

## Phase 2: UI Implementation - "Select All" Checkbox
Integrate the "Select All" checkbox into the existing Feeds page header refinement.

- [ ] Task: Update the `FeedList` header/controls area.
    - [ ] Add the "Select All" checkbox component next to the sort/filter controls.
    - [ ] Connect the checkbox to the selection logic developed in Phase 1.
- [ ] Task: TDD - UI tests for "Select All" checkbox.
    - [ ] Verify the checkbox is correctly positioned in the sort/filter row.
    - [ ] Verify the checkbox accurately reflects the selection state (including indeterminate).
- [ ] Task: Conductor - User Manual Verification 'Phase 2: UI Implementation - "Select All" Checkbox' (Protocol in workflow.md)

## Phase 3: UI Implementation - Floating Bulk Action Bar
Bring the floating `BulkActionBar` to the Feeds page.

- [ ] Task: Integrate `BulkActionBar` into the Feeds page.
    - [ ] Reuse the existing `BulkActionBar` component or its patterns.
    - [ ] Implement the visibility logic (show when `selectedCount > 0`).
    - [ ] Add a "Tag" action to the bar that opens a bulk tagging dialog (reusing existing tagging logic if possible).
- [ ] Task: TDD - Integration tests for `BulkActionBar` on Feeds page.
    - [ ] Verify the bar appears when a feed is selected and disappears when deselected.
    - [ ] Verify the bar's position and animation match the Home page.
- [ ] Task: Conductor - User Manual Verification 'Phase 3: UI Implementation - Floating Bulk Action Bar' (Protocol in workflow.md)

## Phase 4: Bulk Tagging Functionality
Ensure the bulk tagging action correctly updates multiple feeds.

- [ ] Task: Implement bulk tagging logic.
    - [ ] Ensure the tagging service/API can handle multiple feed IDs.
    - [ ] Connect the `BulkActionBar` "Tag" action to the backend update logic.
- [ ] Task: TDD - Integration tests for bulk tagging.
    - [ ] Verify that tags are correctly applied to all selected feeds.
    - [ ] Verify that tags are correctly removed from all selected feeds.
- [ ] Task: Conductor - User Manual Verification 'Phase 4: Bulk Tagging Functionality' (Protocol in workflow.md)
