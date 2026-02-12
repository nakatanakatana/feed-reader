# Implementation Plan: UI Optimization & Information Density (ui_optimization_20260212)

## Phase 1: Header Refinement & Information Density
Goal: Remove redundant page titles and increase the number of visible items by reducing vertical padding.

- [x] Task: Reduce vertical padding in item list rows 0f54bde
    - [ ] Write Vitest tests to verify CSS class or style properties for item row height
    - [ ] Adjust CSS (e.g., in `frontend/src/styles.css` or component-specific styles) to reduce padding
- [ ] Task: Remove page titles from All Items and Feed Management views
    - [ ] Update `AllItems` (or similar) component to remove "All Items" header
    - [ ] Update `FeedManagement` component to remove "Feed Management" header
    - [ ] Verify that navigation links in the sidebar clearly indicate the active route
- [ ] Task: Conductor - User Manual Verification 'Phase 1: Header Refinement & Information Density' (Protocol in workflow.md)

## Phase 2: Horizontal Scrolling for Tag Lists
Goal: Consolidate tag lists into a single row with horizontal scrolling and arrow indicators.

- [ ] Task: Implement horizontal scroll for All Items tag filters
    - [ ] Write Vitest tests for the `TagList` or filter component to verify single-row layout
    - [ ] Update layout to `flex-nowrap` with `overflow-x-auto`
    - [ ] Add left/right arrow buttons that appear when scrolling is possible
- [ ] Task: Implement horizontal scroll for Feed Management tags
    - [ ] Apply similar horizontal scroll and arrow button logic to the tags under the "Add Feed" form
- [ ] Task: Conductor - User Manual Verification 'Phase 2: Horizontal Scrolling for Tag Lists' (Protocol in workflow.md)

## Phase 3: Improved Bulk Action UI
Goal: Move bulk action buttons to a floating bottom bar to prevent layout shifts.

- [ ] Task: Create a floating action bar for bulk operations
    - [ ] Write Vitest tests to verify the action bar is rendered at the bottom and uses fixed/absolute positioning
    - [ ] Implement the `BulkActionBar` component (or update existing logic)
    - [ ] Ensure the list of items does not shift when the bar appears
- [ ] Task: Conductor - User Manual Verification 'Phase 3: Improved Bulk Action UI' (Protocol in workflow.md)
