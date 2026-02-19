# Specification: ItemDetailModal Received/Published Display Refinement

## Overview
Refine the display of "Received" and "Published" timestamps in the `ItemDetailModal`. Currently, these text labels take up significant space and often wrap to two lines on narrow viewports. On screens 480px or narrower, these labels will be replaced with intuitive icons with tooltips to maintain a compact yet informative layout.

## Functional Requirements
- **Responsive Display Toggle:**
  - Viewport > 480px: Show labels "Published: [Date]" and "Received: [Date]" (current behavior).
  - Viewport <= 480px: Show icons instead of text labels: [Icon] [Date].
- **Icon Selection:**
  - Published: A `Send` or `Rss` style icon.
  - Received: A `Clock` or `Calendar` style icon.
- **Tooltips:**
  - Implement tooltips (or at least `title` attributes) for icons to clearly indicate "Published" or "Received" when hovered or tapped.
- **Maintain Existing Logic:**
  - Keep `formatDate` logic and other metadata (Author, Categories) unchanged.

## Non-Functional Requirements
- **Accessibility:** Use `aria-label` or `title` to ensure screen readers can identify the meaning of icons.
- **Consistency:** Align with Panda CSS breakpoints and project-wide styling patterns.

## Acceptance Criteria
- On screens <= 480px, "Published:" and "Received:" text labels are replaced by icons.
- Hovering over icons reveals their meaning (Published/Received).
- The metadata row remains compact and fits better on narrow screens.

## Out of Scope
- Changing the date format itself.
- Modifications to the list view or other components.
