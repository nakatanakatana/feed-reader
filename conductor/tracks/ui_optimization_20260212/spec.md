# Specification: UI Optimization & Information Density (ui_optimization_20260212)

## Overview
Optimize the UI to increase the amount of information a user can see at once and improve efficiency, especially on devices with limited screen space like mobile terminals. This involves removing redundant elements, condensing information, and stabilizing the layout to prevent layout shifts.

## Functional Requirements
- **Header Refinement**
  - Remove page titles such as "All Items" and "Feed Management".
  - Current location will be identifiable through active states in navigation links (e.g., sidebar).
  - Reclaim the vertical space by moving content up after removing titles.
- **Horizontal Scroll for Tag Lists**
  - Consolidate tag filters on the "All Items" page into a single row with horizontal scrolling.
  - Apply the same horizontal scroll behavior to the tag list under the "Add Feed" form on the "Feed Management" page.
  - Implement arrow buttons on the left/right to clearly indicate that the list is scrollable.
- **Improved Bulk Action UI**
  - Display bulk action buttons (e.g., Mark as Read) as a floating bar at the bottom of the screen when items are selected.
  - Ensure that the appearance/disappearance of this bar does not cause layout shifts (i.e., the list of items should not jump down).
- **Increased Information Density**
  - Reduce the vertical padding of rows in the item list to increase the number of visible items per screen.

## Non-Functional Requirements
- **Responsive Design**: Prioritize mobile usability while maintaining a clean look on desktop displays.
- **Visual Clarity**: Ensure that increasing information density does not compromise readability or make interactive elements difficult to tap/click.

## Acceptance Criteria
- Large page titles are removed, and content starts higher on the page.
- Tag lists are restricted to a single row and are scrollable using arrow buttons.
- Selecting items triggers a floating action bar at the bottom without shifting the list's position.
- Item list rows are more compact, showing more items in the viewport compared to the previous version.

## Out of Scope
- Major changes to font sizes.
- Restructuring the sidebar or converting it into a hamburger menu.
