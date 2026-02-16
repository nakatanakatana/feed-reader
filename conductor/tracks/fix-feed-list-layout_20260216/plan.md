# Implementation Plan: Adjust Feed List Layout for Narrow Viewports

This plan focuses on making the feed list responsive, ensuring titles are truncated and action buttons are consolidated on narrow screens to prevent horizontal scrolling and layout breakage.

## Phase 1: Investigation & Test Setup [checkpoint: 2b33593]
Confirm existing layout implementation and set up regression tests to catch horizontal overflow and overlapping elements.

- [x] Task: Identify the CSS and components responsible for the Feed List item layout.
- [x] Task: Create integration tests in `frontend/src/components/FeedList.Responsive.test.tsx` that simulate narrow viewports (e.g., 320px) and check for horizontal scrolling or element overlap.
- [x] Task: Conductor - User Manual Verification 'Phase 1: Investigation & Test Setup' (Protocol in workflow.md)

## Phase 2: Implement Layout Fixes
Apply CSS changes to ensure titles truncate and the layout remains stable without horizontal overflow.

- [x] Task: Update Feed List item CSS to implement ellipsis truncation for long titles.
- [x] Task: Apply CSS constraints to ensure container stability and prevent horizontal overflow (`min-width: 0`, `overflow: hidden`).
- [x] Task: Verify truncation and layout integrity via the previously created tests.
- [~] Task: Conductor - User Manual Verification 'Phase 2: Implement Layout Fixes' (Protocol in workflow.md)

## Phase 3: Responsive Action Buttons (Kebab Menu)
Consolidate action buttons into a kebab menu for narrow viewports.

- [ ] Task: Create or integrate a Kebab Menu (⋮) component for feed actions (Edit, Delete, etc.).
- [ ] Task: Update the Feed List item to show the kebab menu and hide individual buttons on narrow screens (using CSS media queries or SolidJS conditional rendering).
- [ ] Task: Ensure the kebab menu is accessible and functional.
- [ ] Task: Conductor - User Manual Verification 'Phase 3: Responsive Action Buttons' (Protocol in workflow.md)

## Phase 4: Final Verification
Ensure everything works across various screen sizes and meets the "No Horizontal Overflow" requirement.

- [ ] Task: Run all frontend tests to ensure no regressions in Feed List functionality.
- [ ] Task: Perform manual responsive testing (320px to 1200px) to verify smooth transitions and lack of horizontal scroll.
- [ ] Task: Conductor - User Manual Verification 'Phase 4: Final Verification' (Protocol in workflow.md)
