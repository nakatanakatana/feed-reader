# Track: Block Rules List Improvements (Frontend-only Filter/Sort)

## Overview
Improve the user experience of the Block Rules list by adding client-side filtering and sorting capabilities. This will be implemented using `liveQuery` in the frontend, operating on the existing state managed by TanStack DB/Query without additional backend requests for sorting/filtering.

## Functional Requirements
- **Filtering (Local State):**
  - **Type Filter:** A dropdown menu to filter rules by their type (e.g., 'User', 'Domain').
  - **Domain Filter:** A dropdown menu to filter rules by their domain (e.g., 'github.com', 'twitter.com').
  - Filters should be additive (e.g., filtering by both Type and Domain).
- **Sorting (Local State):**
  - Interactive table headers for **Type**, **Value**, and **Domain**.
  - Clicking a header should toggle between Ascending and Descending order.
  - Sorting should be applied in real-time to the currently visible list.
- **UI/UX:**
  - **Desktop:** A structured table with interactive headers and a filter bar at the top.
  - **Mobile:** A simplified, single-column list view with a compact filter/sort toggle bar.
  - **Immediate Feedback:** Changes to filters or sorts should reflect instantly in the UI.

## Non-Functional Requirements
- **Performance:** Use `liveQuery` hooks to efficiently derive filtered/sorted views from the local store.
- **Responsiveness:** Ensure the filter/sort UI is accessible and functional on all device sizes.
- **Maintainability:** Leverage existing TanStack DB patterns for state derivation.

## Acceptance Criteria
- [ ] Users can filter the block rules list by Type and Domain using dropdown menus.
- [ ] Users can sort the list by Type, Value, and Domain by clicking table headers.
- [ ] The list updates instantly when filters or sorts are changed.
- [ ] The mobile view displays a clean, readable list of rules with filter/sort access.
- [ ] No extra network requests are triggered when filtering or sorting (frontend-only).

## Out of Scope
- Backend-side filtering or sorting.
- Bulk operations (delete, tagging) on the filtered list.
- Pagination (beyond what is already implemented).
- Advanced pattern matching or regex filtering.
