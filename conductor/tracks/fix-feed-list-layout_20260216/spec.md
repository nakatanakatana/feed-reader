# Specification: Adjust Feed List Layout for Narrow Viewports

## Overview
Narrow viewports currently cause the feed list layout to break. Long feed titles push adjacent elements (like unread counts) out of place, and action buttons overlap or overflow the screen, often leading to unwanted horizontal scrolling. This track aims to make the feed list fully responsive, ensuring layout integrity and a zero-horizontal-scroll experience on small screens.

## Functional Requirements
- **Title Truncation**: Feed titles that exceed the available horizontal space must be truncated with an ellipsis (...).
- **Responsive Action Buttons**: On narrow screens, individual action buttons (Edit, Delete, etc.) for each feed should be consolidated into a single "kebab" menu (⋮) to save space.
- **Layout Integrity**: Ensure that the unread count and other status indicators remain visible and correctly aligned regardless of the title length.
- **No Horizontal Overflow**: Implement CSS constraints (e.g., `overflow: hidden`, `min-width: 0`) to ensure the feed list and its items never trigger horizontal scrolling on the page or within the list container.

## Non-Functional Requirements
- **Responsive Design**: The layout should adapt seamlessly from mobile-sized viewports to larger screens.
- **Accessibility**: Ensure the kebab menu and its contained actions are keyboard and screen-reader accessible.

## Acceptance Criteria
- [ ] Feed titles do not push other elements out of the container on narrow screens.
- [ ] Titles are truncated with an ellipsis when space is insufficient.
- [ ] Action buttons are moved to a kebab menu when the viewport is below a certain threshold (e.g., 640px).
- [ ] The unread count remains properly aligned.
- [ ] **No horizontal scrolling is introduced in the feed list item or the main viewport.**
- [ ] Layout remains stable and functional down to 320px width.

## Out of Scope
- Redesigning the entire feed list card or adding new feed metadata.
- Changing the layout for wide screens (desktop view).
