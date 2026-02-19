# Specification: Item List Date Display & Responsive Icons

## Overview
Standardize the date display in the `ItemList` (article list) to align with the `ItemDetailModal`. This includes reordering the dates to "Published" followed by "Received" and implementing responsive iconization when the viewport width is narrow.

## Functional Requirements
- **Reorder Date Display**: Update the `ItemList` to display "Published" date first, followed by "Received" date.
- **Responsive Iconization**: When the display area width is less than **480px**, replace text labels (e.g., "Published", "Received") with icons.
- **Tooltip Integration**: Ensure that when icons are displayed, a tooltip containing the full date/time information appears on hover, consistent with the `ItemDetailModal` implementation.
- **Visual Consistency**: Use the same icons for "Published" and "Received" as those currently used in the `ItemDetailModal`.

## Non-Functional Requirements
- **Accessibility**: Provide appropriate `aria-label` or alternative text for the icons to ensure screen reader compatibility.
- **Maintainability**: Reuse existing UI components or patterns from `ItemDetailModal` where possible to minimize code duplication.

## Acceptance Criteria
- [x] In the `ItemList`, the order of dates is "Published" followed by "Received".
- [x] When the viewport width is less than **480px**, the text labels for dates are replaced by their respective icons.
- [x] Hovering over the icons displays a tooltip with the correct date and time information.
- [x] When the viewport width is **480px** or greater, the full text labels remain visible.

## Out of Scope
- Changing the actual date formatting logic (e.g., changing from relative to absolute time).
- Modifications to other lists like the `FeedList`.
