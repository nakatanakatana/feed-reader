# Track Specification: Item Detail End-of-List Placeholder & Filter Preservation

## Overview
This track introduces a virtual placeholder article at the end of the item list in the `ItemDetailModal` to streamline the process of marking the last item as read and ensures that the user's current filter state (tags and date filters) is preserved when returning to the list view.

## Background & Objectives
- Currently, marking the last item as read is cumbersome because the automatic "mark as read" trigger occurs when moving to the *next* item. Since there is no "next" item after the last one, the user must manually mark it or close the modal.
- When a user closes the item detail view, the application currently navigates to the root `/` path, which resets the active tag and date filters, disrupting the user's reading flow.

## Functional Requirements

### 1. End-of-List Placeholder
- Append a virtual "placeholder" state after the last item in the list.
- Navigating "Next" (via button click or `j`, `l`, `ArrowRight` keys) from the last actual item will transition the view to this placeholder.
- **Placeholder Content:**
    - Display a clear message: "You've reached the end of the list."
    - Display a "Back to List" button that closes the modal.
- **Navigation Restrictions:**
    - The placeholder is the terminal point of the list; further "Next" navigation is impossible.
    - The "Next" button must be disabled, and keyboard "Next" actions must be ignored.
    - "Previous" navigation from the placeholder back to the last actual item is permitted.

### 2. Auto-Read on Transition to Placeholder
- Moving from the last actual item to the placeholder must trigger the "mark as read" logic for that item.
- This ensures a consistent user experience where every item can be marked as read simply by navigating forward.

### 3. Filter Preservation
- When closing the `ItemDetailModal` (via "Close" button, `Escape` key, or the placeholder's "Back to List" button), the application must return to the list view with the current `tagId` and `since` filters intact.

## Non-Functional Requirements
- **Consistency:** The placeholder UI should match the existing `ItemDetailModal` design language.
- **Performance:** Virtual item navigation should be instantaneous and not impact list rendering performance.

## Out of Scope
- Placeholder at the beginning of the list.
- Changes to the core logic of how read items are hidden/shown in the list.
