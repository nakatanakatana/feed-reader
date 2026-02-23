# Implementation Plan: Block Rules List Improvements

This plan outlines the steps to add frontend-only filtering and sorting to the Block Rules list using `liveQuery` in SolidJS.

## Phase 1: State Management & Data Filtering (SolidJS Store & LiveQuery) [checkpoint: d658d36]
Add the necessary reactive state to manage filtering and sorting criteria and derive the filtered/sorted list of rules.

- [x] Task: Create a new SolidJS Store (or update existing one) to handle local filter and sort states for Block Rules. 550b662
- [x] Task: Implement the reactive derivation logic (`liveQuery` or a simple reactive filter/sort) to produce the visible rules list based on the active criteria. 6c9b31e
- [x] Task: Write unit tests to verify that rules are correctly filtered by Type and Domain and sorted by Type, Value, and Domain in the store. 6c9b31e
- [x] Task: Conductor - User Manual Verification 'State Management & Data Filtering' (Protocol in workflow.md) d658d36

## Phase 2: Filter UI Components (Frontend - Dropdowns) [checkpoint: a304d25]
Implement the filter dropdowns and integrate them with the new reactive state.

- [x] Task: Create or update the `BlockRulesFilterBar` component with dropdown menus for Type and Domain filters. a986c35
- [x] Task: Implement the logic to update the Store when a filter option is selected. a986c35
- [x] Task: Write integration tests for the `BlockRulesFilterBar` to ensure selecting an option triggers the correct state change. a986c35
- [x] Task: Conductor - User Manual Verification 'Filter UI Components' (Protocol in workflow.md) a304d25

## Phase 3: Sortable Table Headers (Frontend - Interactive Table) [checkpoint: f6858d8]
Implement interactive table headers to toggle sorting on the rules list.

- [x] Task: Update the `BlockRulesTable` component to make Type, Value, and Domain headers clickable. 057fd95
- [x] Task: Implement the logic to toggle sort direction (Ascending/Descending) and update the Store. 057fd95
- [x] Task: Write integration tests to ensure clicking a header correctly triggers the sort state change. 057fd95
- [x] Task: Conductor - User Manual Verification 'Sortable Table Headers' (Protocol in workflow.md) f6858d8

## Phase 4: Mobile & Responsive Enhancements [checkpoint: f843efc]
Refine the layout for mobile viewports, including a compact filter/sort bar and simplified rule list.

- [x] Task: Implement the mobile-specific list view layout with a sticky or collapsible filter/sort bar. 1904eef
- [x] Task: Ensure the layout is responsive and usable on narrow viewports (< 480px). 1904eef
- [x] Task: Write mobile-specific tests to verify responsive behavior. 1904eef
- [x] Task: Conductor - User Manual Verification 'Mobile & Responsive Enhancements' (Protocol in workflow.md) f843efc

## Phase 5: Final Integration & Regression Testing [checkpoint: 94a15c7]
Perform final checks to ensure everything works seamlessly and no regressions were introduced.

- [x] Task: Verify that no extra backend network requests are made during filtering or sorting operations. 9b4f2d7
- [x] Task: Conduct overall manual verification across desktop and mobile. 9b4f2d7
- [x] Task: Conductor - User Manual Verification 'Final Integration & Verification' (Protocol in workflow.md) 94a15c7
