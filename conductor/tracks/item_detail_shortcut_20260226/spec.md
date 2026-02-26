# Specification: Keyboard Shortcut for Read/Unread Toggle

## Overview
Add a keyboard shortcut `m` (case-insensitive) to the `ItemDetailModal` to allow users to toggle the read/unread status of the current article without using a mouse or touch interaction.

## Functional Requirements
- **Trigger:** Pressing the `m` or `M` key while the `ItemDetailModal` is open and active must toggle the read/unread status of the displayed article.
- **Toggle Logic:**
  - If the item is currently "unread", it should be marked as "read".
  - If the item is currently "read", it should be marked as "unread".
- **State Synchronization:** The Floating Action Button (FAB) in the `ItemDetailModal` must update its visual state (icon/color) immediately to reflect the new status.
- **Persistence:** The status change must be persisted to the backend (via existing API calls).
- **Modal Behavior:** The modal must remain open after the toggle. Focus must remain within the modal to allow further interaction.

## Non-Functional Requirements
- **Performance:** The toggle should feel instantaneous to the user.
- **Accessibility:**
  - State changes must be announced to screen readers (e.g., using ARIA live regions) as "Marked as read" or "Marked as unread".
  - The keyboard event listener must be properly scoped to the modal to avoid unintended triggers when the modal is closed.

## Acceptance Criteria
- [ ] Pressing `m` toggles status from unread to read.
- [ ] Pressing `M` (Shift+m) toggles status from unread to read.
- [ ] Pressing `m` toggles status from read to unread.
- [ ] Visual state of the FAB updates immediately.
- [ ] Screen readers announce the state change.
- [ ] Focus remains stable after toggling.
- [ ] The shortcut does not trigger if the modal is not open.

## Out of Scope
- Adding other keyboard shortcuts (e.g., navigation `n`/`p`) as they are considered part of existing or separate features.
- Bulk operations via keyboard from the list view.
