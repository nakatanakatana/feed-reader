# Implementation Plan: Optimize ItemDetailModal Header Height

This plan focuses on increasing the main content display area by minimizing the header and converting the "Mark as read" button into a Floating Action Button (FAB) in the `ItemDetailModal`.

## Phase 1: Preparation and Header Refinement
Focus on reducing the header's vertical footprint by adjusting styles and layout.

- [ ] **Task: Analysis & Styling Setup**
    - [ ] Review `ItemDetailModal.tsx` and related Panda CSS styles.
    - [ ] Identify existing padding, margin, and font-size constants used in the header.
- [ ] **Task: Header Height Minimization (TDD)**
    - [ ] **Write Tests**: Update or add tests in `ItemDetailModal.UI.test.tsx` to verify the header's reduced height (e.g., checking specific CSS classes or computed styles if possible).
    - [ ] **Implement**: Modify `ItemDetailModal.tsx` to reduce vertical padding and optimize font sizes in the header section.
    - [ ] **Verify**: Ensure tests pass and the header occupies less vertical space.
- [ ] **Task: Conductor - User Manual Verification 'Phase 1' (Protocol in workflow.md)**

## Phase 2: Floating Action Button (FAB) Implementation
Relocate the "Mark as read" button from the header to a FAB.

- [ ] **Task: Create/Update FAB Component (TDD)**
    - [ ] **Write Tests**: Create tests for a FAB component or update `ItemDetailModal.Logic.test.tsx` to ensure the "Mark as read" action is triggered by a button with FAB-like properties (position: fixed/absolute at bottom-right).
    - [ ] **Implement**: Create or update the button component to be a FAB. Update `ItemDetailModal.tsx` to remove the button from the header and place it as a FAB.
    - [ ] **Verify**: Ensure clicking the FAB still marks the item as read and navigates appropriately if configured.
- [ ] **Task: Responsive Polishing (TDD)**
    - [ ] **Write Tests**: Update `ItemDetailModal.Responsive.test.tsx` to verify FAB placement and header compactness on both mobile and desktop viewports.
    - [ ] **Implement**: Adjust Panda CSS styles to ensure the FAB doesn't obscure content and the header remains thin across all breakpoints.
    - [ ] **Verify**: Run responsive tests in Vitest browser mode.
- [ ] **Task: Conductor - User Manual Verification 'Phase 2' (Protocol in workflow.md)**

## Phase 3: Final Verification and Cleanup
Ensure overall quality and adherence to project standards.

- [ ] **Task: Regression Testing**
    - [ ] Run all tests in `frontend/src/components/ItemDetailModal.*.test.tsx` to ensure no functionality (swipe, navigation, auto-read) was broken.
- [ ] **Task: Final UI Review**
    - [ ] Check accessibility (ARIA labels for FAB) and visual consistency with the rest of the application.
- [ ] **Task: Conductor - User Manual Verification 'Phase 3' (Protocol in workflow.md)**
