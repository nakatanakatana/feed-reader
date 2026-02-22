# Specification: Fix ItemList Horizontal Overflow

## Overview
Fix horizontal scrolling on the ItemList page for narrow viewports. The issue was likely introduced when the item's source domain was added to the metadata line. When the domain name is long, it pushes the metadata beyond the viewport width.

## Functional Requirements
- **Flexible Layout**: Implement wrapping for the metadata row (Domain, PublishedAt, ReceivedAt) in the ItemList using Flexbox (`flex-wrap: wrap`) or similar.
- **Conditional Wrapping**: The layout should only wrap when the content exceeds the available width, maintaining a single-line display on wider screens.
- **Metadata Consistency**: Maintain existing styling and behavior for PublishedAt, ReceivedAt, and other metadata elements, except for the wrapping capability.

## Non-Functional Requirements
- **Consistency**: Align with "Adaptive Metadata Display" guidelines in `product.md` for narrow viewports (< 480px).
- **Aesthetics**: Ensure proper spacing and alignment even when the metadata wraps to multiple lines.

## Acceptance Criteria
- [ ] No horizontal scroll bar appears on narrow viewports (e.g., 375px) even with long domain names.
- [ ] Metadata items wrap correctly and remain readable when space is limited.
- [ ] Layout remains unchanged on desktop/wide viewports.

## Out of Scope
- Redesigning the ItemList card structure.
- Changes to the article detail modal (focus is on the list view).