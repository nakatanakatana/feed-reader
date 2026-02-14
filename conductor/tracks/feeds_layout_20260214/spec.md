# Track Specification: Feeds Layout Refinement for Small Screens

## Overview
Optimize the layout of the `/feeds` page for small screens (mobile devices, etc.) to improve vertical space efficiency. Specifically, move the `importOPML` button, which currently occupies a single line, and reduce unnecessary whitespace and separators between the add-feed form and the list.

## Functional Requirements
- **Repositioning the `importOPML` button**:
  - Stop displaying the button on an independent line and place it next to the "Add Feed" form.
  - On narrow screens like mobile, hide the text and display only an icon to save space.
- **Tighten the layout**:
  - Reduce overall spacing (Margin/Padding) between the "Add Feed" form and the "Feed List".
  - Remove the `<hr>` (horizontal rule) separator between sections to reduce visual disconnection.

## Non-Functional Requirements
- **Responsive Design**: Ensure the button display format (Text+Icon vs. Icon-only) switches appropriately based on screen width.
- **Consistency**: Adhere to existing Panda CSS and component library style definitions.

## Acceptance Criteria
- [ ] On the `/feeds` page, the `importOPML` button is placed on the same line (or adjacent) as the form.
- [ ] On narrow screens, the `importOPML` button is displayed as an icon only.
- [ ] The `<hr>` between the form and the list has been removed.
- [ ] The spacing between the form and the list is significantly smaller than before.
- [ ] Information density in mobile view has increased, allowing more content to be visible without scrolling.

## Out of Scope
- Changes to the card design of the Feed List itself.
- Changes to the backend logic for adding feeds or importing OPML.
