# Specification: ItemDetailModal Image Layout Adjustment

## Overview
When displaying article content within the `ItemDetailModal`, multiple images (`img`) inside a paragraph (`p`) should be displayed side-by-side using a flexbox layout. This adjustment prevents excessive vertical space when multiple small images or icons appear consecutively, providing a more organized visual experience.

## Functional Requirements
- **Flexbox Layout**: Apply flexbox styling to paragraph elements (`p`) containing multiple images to align them horizontally.
- **Wrapping Behavior**: Ensure images wrap to the next line (`flex-wrap: wrap`) when they exceed the width of the modal container.
- **Spacing**: Maintain a standard gap (e.g., `8px` or `16px`) between images to prevent them from touching.
- **Compatibility**: Ensure this change does not break existing image styling, such as responsive width constraints (e.g., `max-width: 100%`).

## Non-Functional Requirements
- **Performance**: Implementation should be handled via CSS/Panda CSS to minimize runtime overhead.
- **Maintainability**: Styles should be defined following the project's established Panda CSS patterns.

## Acceptance Criteria
- [ ] Multiple images within a single `p` tag in the `ItemDetailModal` are displayed horizontally.
- [ ] Images wrap correctly to the next line on narrow screens or small modal widths.
- [ ] Appropriate spacing exists between adjacent images.
- [ ] Paragraphs with a single image or mixed content (text and images) maintain their readability and standard layout.

## Out of Scope
- Specialized layout adjustments for mixed content (text and images intertwined).
- Implementing image zoom or lightbox functionality.
