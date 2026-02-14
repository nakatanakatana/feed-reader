# Track Specification: Feeds Bulk Operation UI Refinement

## Overview
Refine the bulk operation UI on the Feeds page to align with the experience on the Home (Items) page. This includes adding a "Select All" capability and a floating action bar for efficient multi-feed management, specifically for tagging operations.

## Functional Requirements
- **"Select All" Checkbox**
  - Add a checkbox to the same row as the sort and filter controls.
  - Selecting this checkbox should toggle the selection of all feeds currently visible (respecting active filters/tags).
  - Support indeterminate state (mixed selection) when some but not all visible feeds are selected.
- **Floating Bulk Action Bar**
  - Implement a floating action bar that appears at the bottom of the screen when one or more feeds are selected.
  - The design and animation must be consistent with the `BulkActionBar` used on the Home page.
- **Bulk Tag Management**
  - Provide functionality within the bulk action bar to add or remove tags for all selected feeds simultaneously.

## Non-Functional Requirements
- **UI/UX Consistency**: Ensure the behavior and visual style are identical to the existing bulk action patterns in the application.
- **Responsiveness**: The UI must remain functional and ergonomically accessible on mobile devices.

## Acceptance Criteria
- [ ] A "Select All" checkbox is visible in the sort/filter row on the Feeds page.
- [ ] Clicking the checkbox toggles the selection of all currently displayed feeds.
- [ ] A floating action bar appears/disappears at the bottom of the screen based on the selection state.
- [ ] Users can bulk add or remove tags from selected feeds via the action bar.
- [ ] The action bar follows the same animation and styling as the one on the Home page.

## Out of Scope
- Bulk deletion of feeds.
- Bulk refreshing/updating of feeds.
