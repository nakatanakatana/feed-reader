# Specification: Fix ItemDetailModal Read/Unread FAB State

## Overview
Fix a bug in `ItemDetailModal` where the Floating Action Button (FAB) used to toggle an item's read/unread status is always displayed as "Mark as Read," regardless of the item's actual status.

## Problem Statement
The `ItemDetailModal` currently relies on separate detail data fetched for the modal to determine the FAB's state. Consequently, it fails to reflect the latest status within the `items` collection managed by the `ItemList`, leading to incorrect or stale representation.

## Functional Requirements
1. **Prioritized Data Source for Status**:
   - When determining the FAB's display state (read/unread), prioritize looking up the target item within the `items` collection.
   - Use the server-provided detail data as a fallback only if the target item is not found in the `items` collection (e.g., when accessing via a deep link).
2. **Synchronized State Updates**:
   - When the FAB is clicked, execute `items().update` to update the data within the collection.
   - Ensure that this update triggers existing collection handlers, such as list view updates and the visibility toggle for read items.

## Non-Functional Requirements
- **Reactivity & Performance**: Leverage SolidJS's reactive system to ensure the UI updates efficiently without introducing lag during collection lookups.

## Acceptance Criteria
- [ ] For an unread item, the FAB in `ItemDetailModal` displays the "Mark as Read" icon/label.
- [ ] For a read item, the FAB in `ItemDetailModal` displays the "Mark as Unread" icon/label.
- [ ] Clicking the FAB immediately toggles the button's display state.
- [ ] Closing the modal correctly reflects the item's status in the list view (e.g., unread badges, or being hidden if the "show only unread" filter is active).

## Out of Scope
- Modifying the core logic of keyboard shortcuts (assuming they already work as intended).
- Modifying UI components other than `ItemDetailModal` and its immediate dependencies.
