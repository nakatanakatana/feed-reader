# Specification: Responsive Header for Feed List

## Overview
Currently, the header section of the Feed List view (`/feeds`) breaks on narrow screens (e.g., mobile devices). Filter conditions overflow the screen, and the "Total Unread" count is displayed awkwardly. This track aims to implement a responsive layout that stacks elements vertically and ensures all controls remain accessible and visually coherent on small screens.

## User Persona
- **Mobile Users:** Users accessing the feed reader on smartphones who need to see their total unread count and change filters/sorting without horizontal scrolling or layout breakage.

## Functional Requirements
- **Responsive Header Layout:**
    - On narrow screens (breakpoints to be defined by existing UI patterns, e.g., < 768px):
        - Elements must stack vertically.
        - **Top Level:** Display the "Total Unread" count prominently.
        - **Middle Level:** Stack Filter and Sort controls vertically or in a wrapped flex layout to prevent overflow.
        - **Title:** The "Feed List" title should be minimized or hidden to save vertical space if necessary.
- **Floating Action Buttons (FAB):**
    - Move primary action buttons (like "Mark all as read") to a floating button at the bottom right of the screen on narrow widths to improve reachability and clear header space.
- **Desktop Layout Preservation:**
    - The existing horizontal layout should remain unchanged for wide screens.

## Non-Functional Requirements
- **Consistency:** Follow existing Panda CSS patterns and Material Design principles as outlined in `product.md`.
- **Performance:** Ensure no layout shift (CLS) during screen resizing or initial load.
- **Accessibility:** Ensure touch targets for stacked controls are at least 44x44px.

## Acceptance Criteria
- [ ] The `/feeds` header does not exhibit horizontal scrolling on narrow screens (down to 320px).
- [ ] "Total Unread" is clearly visible at the top of the header on mobile.
- [ ] Filter and Sort controls are fully visible and functional when stacked.
- [ ] Action buttons are accessible via a floating button at the bottom of the screen on narrow viewports.
- [ ] Layout transitions smoothly between mobile and desktop views.

## Out of Scope
- Redesigning the feed cards themselves.
- Changes to the Item List view (`/items`) header (unless shared components are used).
