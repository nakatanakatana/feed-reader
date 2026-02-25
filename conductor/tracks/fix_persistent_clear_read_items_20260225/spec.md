# Track Specification: Fix Persistent Clear Read Items

## Overview
Ensure that items marked as "cleared" by the "Clear Read Items" button do not reappear in the session even after a new fetch (automatic or manual) is executed.

## Functional Requirements
- **Transient Removal of Read Items**: When the "Clear Read Items" button is pressed, the targeted read items are removed from the local state (TanStack DB).
- **Persistent Hiding After Fetch**: Items that have been cleared during the current session must remain hidden even if they are re-fetched from the backend (via background refresh or manual "Refresh").
- **Session-Based State Management**: The "cleared" state is maintained only for the current browser session.

## Non-Functional Requirements
- **Performance**: Ensure efficient removal and filtering from TanStack DB, even with a large number of items.

## Acceptance Criteria
- [ ] Clicking "Clear Read Items" removes the targeted read items from the list view.
- [ ] Clicking the manual "Refresh" button or triggering a background fetch does not cause the cleared items to reappear.
- [ ] Reloading the browser restores all items if the "Show Read" toggle is ON.

## Out of Scope
- Permanent deletion from the backend database.
- Synchronization of the "cleared" state across different devices or browsers.
