# Track Specification: remove-unused-ui-elements

## Overview
Remove UI elements that have become redundant due to alternative methods such as keyboard shortcuts. This will declutter the interface, improve information density, and simplify the codebase.

## Functional Requirements
- **ItemDetailModal**
  - Remove the "Previous" and "Next" navigation buttons.
  - Delete UI components and styles specifically associated with these buttons.
- **ItemRow**
  - Remove the individual "Mark as Read" button (typically a checkmark icon) from each item row.
- **Logic Cleanup**
  - Identify and remove any logic or functions that were exclusively used by the deleted buttons.
  - Maintain logic used by other features, such as keyboard shortcuts for navigation and read status management.

## Non-Functional Requirements
- **Layout Adjustment**
  - Reclaim the space vacated by the removed buttons to expand existing elements like titles, dates, or source names, enhancing overall visibility.
- **Test Maintenance**
  - Identify and remove or update existing tests (e.g., Vitest) that verify the presence or interaction of the deleted buttons.

## Acceptance Criteria
- [ ] "Previous" and "Next" buttons are no longer present in `ItemDetailModal`.
- [ ] Individual "Mark as Read" buttons are no longer present in `ItemRow`.
- [ ] The layout in `ItemDetailModal` is adjusted correctly, with other elements (like titles) appropriately positioned after button removal.
- [ ] The layout in `ItemRow` is optimized, expanding the title and date display areas.
- [ ] Keyboard shortcuts (e.g., J/K for navigation) continue to function correctly.
- [ ] All existing tests pass, and obsolete test cases have been removed.

## Out of Scope
- Modifying or adding new keyboard shortcuts.
- Removing bulk actions (e.g., marking multiple selected items as read); this track only targets individual item buttons.
