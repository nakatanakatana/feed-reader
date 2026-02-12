# Specification: Item Navigation Inclusion of Read Items

## Overview
Currently, `ItemDetailModal` navigation (Next/Prev) excludes read items, making it difficult for users to revisit items they have just viewed. This track modifies the navigation logic to include read items, specifically matching the items currently visible in the `ItemList`.

## Functional Requirements
- **Synchronized Navigation**: The items available for "Next" and "Previous" navigation in the `ItemDetailModal` must exactly match the list of items currently rendered in the `ItemList`.
- **Include Read Items**: Items that are already marked as read, or become read during the current session, must remain in the navigation sequence as long as they are visible in the `ItemList`.
- **Preserve Ordering**: The navigation order must respect the current sorting and filtering (search, tags, date filters) applied to the `ItemList`.
- **Dynamic Updates**: If an item's status changes to "read" while the modal is open, it should not be removed from the navigation sequence of the currently active session.

## Non-Functional Requirements
- **Performance**: The calculation of the next/prev item should be efficient and not cause noticeable lag when navigating through a large list of items.

## Acceptance Criteria
- [ ] Users can navigate to a previously viewed (now read) item using the "Previous" button/shortcut.
- [ ] Users can navigate to an already read item using the "Next" button/shortcut if it is present in the `ItemList`.
- [ ] The sequence of navigation matches the visual order of items in the `ItemList` (including applied filters and sorts).
- [ ] Items that are marked as read in the current session remain accessible via navigation until the `ItemList` is refreshed/re-fetched.

## Out of Scope
- Modifying the `ItemList` filtering logic itself.
- Changing how items are marked as read (auto-read behavior).
