# Specification: Prevent Item Detail from polluting browser history

## Overview
Currently, navigating to an item detail view (`/items/$itemId`) adds a new entry to the browser's history stack. This results in users needing to click "back" multiple times if they have navigated through several items within the modal. This track aims to change this behavior so that item navigation uses history replacement, ensuring that the "back" action always returns the user to the list view, regardless of how many items they viewed in the modal.

## Functional Requirements
- **History Replacement on Navigation:** All navigations to the item detail route (`/items/$itemId`) must use `replace: true` (or equivalent) to avoid adding new entries to the browser history.
- **Deep Linking Support:** The URL must still update to reflect the current `itemId` (e.g., `/items/$itemId`) to support page refreshes and link sharing.
- **Back Navigation Behavior:** When the browser's back button is pressed, the user must be returned to the item list view they were on before opening the modal.
- **Sequential Navigation:** Moving to the "next" or "previous" item within the `ItemDetailModal` must also replace the current history entry rather than adding a new one.

## Non-Functional Requirements
- **Consistency:** The behavior should be consistent across all entry points to the item detail view (e.g., clicking an item in the list, using keyboard shortcuts).
- **Performance:** History replacement should not introduce noticeable lag or UI flickering.

## Acceptance Criteria
- [ ] Clicking an item in the list updates the URL but does not add a new entry to the browser history.
- [ ] Navigating between items using keyboard shortcuts (J/K/Arrows) or modal controls updates the URL but does not add new history entries.
- [ ] Pressing the browser's back button while the modal is open immediately closes the modal and shows the list view (as the list view remains the previous entry in the history).
- [ ] Refreshing the page while the modal is open correctly restores the modal with the specified item.
- [ ] Sharing the URL of an item correctly opens that item in the modal upon navigation.

## Out of Scope
- Changes to the visual design of the `ItemDetailModal`.
- Modifications to the filtering or sorting logic of the `ItemList`.
