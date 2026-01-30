# Specification: `improve_root_navigation_20260131`

## Overview
Improve the visual design of the `RootComponent` (the main navigation header) to make the currently active route clearly distinguishable for the user.

## Functional Requirements
- **Active Link Highlighting**:
    - Add a background color (e.g., subtle highlight or pill shape).
    - Add an underline or bottom border as an indicator.
    - Maintain and refine the existing font-weight bolding.
- **Header Design Refresh**:
    - Optimize padding and margins while keeping the overall height compact to maintain information density.
    - Improve aesthetics for a modern look (refining borders, spacing, etc.).
- **Layout**:
    - Maintain a simple left-aligned layout while adjusting the gap between items.

## Non-Functional Requirements
- **Performance**: Use Panda CSS for build-time generation to minimize runtime overhead.
- **Maintainability**: Follow the existing structure of `__root.tsx` and keep style definitions clean.

## Acceptance Criteria
- [ ] When a navigation link is active, it must display both a background highlight and a bottom indicator (underline/border).
- [ ] Inactive links must not show these highlighting effects.
- [ ] The header height must remain compact, ensuring it doesn't take up excessive vertical space.
- [ ] The layout must be responsive and work correctly on both desktop and mobile.

## Out of Scope
- Adding or removing navigation items (Home, Feeds, Tags).
- Adding authentication flows or user profile elements.
