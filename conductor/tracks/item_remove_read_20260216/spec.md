# Specification: Transient Removal of Read Items

## Overview
Add a feature to temporarily remove read items from the frontend state (view) to help users focus on unread articles. This operation is transient and only affects the current session's memory state; it does not modify the backend database.

## Functional Requirements
- **UI Placement**: Add a "Clear Read Items" button to the top toolbar of the item list, near filters and sorting options.
- **Execution Logic**: Upon clicking the button, remove items that are marked as read (`isRead: true`) and match the currently active filters (tags, feeds, date range) from the frontend state (TanStack DB / SolidJS Store).
- **Immediate Action**: No confirmation dialog will be shown; the removal will occur immediately upon clicking.
- **Transience**: This removal is memory-only. Refreshing the page or navigating away and back will cause the items to be re-fetched from the backend and reappear in the list.

## Non-Functional Requirements
- **Responsiveness**: The removal should be performed efficiently without blocking the UI, even with a large number of read items.
- **Accessibility**: Provide appropriate labels (e.g., `aria-label`) for the button.

## Acceptance Criteria
- [ ] A button to clear read items is visible in the top toolbar of the item list.
- [ ] Clicking the button removes read items matching the current filters from the display.
- [ ] Unread items and read items not matching the current filters remain unaffected.
- [ ] Refreshing the page restores the removed items.
- [ ] Clicking the button does not trigger any API requests to the backend.

## Out of Scope
- Physical or logical deletion from the backend database (SQLite).
- Persistence of the removed state across sessions or page reloads.
- Other bulk operations like marking all as read (this track focuses specifically on removal from view).
