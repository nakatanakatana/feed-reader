# Implementation Plan: ItemDetailModal Image Layout Adjustment

This plan outlines the steps to adjust the styling of images within paragraphs in the `ItemDetailModal` to support a flexible horizontal layout.

## Phase 1: Preparation and Test Setup
- [ ] Task: Identify the target component and CSS definitions for article content in `ItemDetailModal.tsx`.
- [ ] Task: Create a reproduction test case in `frontend/src/components/ItemDetailModal.test.tsx` (or a specialized UI test file) that renders multiple images within a paragraph.
    - [ ] Add a test case that verifies images are NOT currently laid out horizontally (expected failure).
- [ ] Task: Conductor - User Manual Verification 'Phase 1: Preparation and Test Setup' (Protocol in workflow.md)

## Phase 2: Implementation of Flex Layout
- [ ] Task: Update Panda CSS recipes or component styles to apply `display: flex` and `flex-wrap: wrap` to `p` tags containing multiple images within the article content.
- [ ] Task: Apply `gap` styling (e.g., `8px` or `16px`) to provide consistent spacing between images.
- [ ] Task: Verify the implementation with the tests created in Phase 1.
- [ ] Task: Ensure that single images or text-only paragraphs are not adversely affected by the new flex styling.
- [ ] Task: Conductor - User Manual Verification 'Phase 2: Implementation of Flex Layout' (Protocol in workflow.md)

## Phase 3: Final Verification and Quality Gates
- [ ] Task: Run all frontend tests to ensure no regressions in `ItemDetailModal` or related components.
- [ ] Task: Perform a manual visual check of the layout with various image sizes and quantities.
- [ ] Task: Verify responsiveness on small screen widths to ensure proper wrapping.
- [ ] Task: Conductor - User Manual Verification 'Phase 3: Final Verification and Quality Gates' (Protocol in workflow.md)
