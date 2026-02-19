# Implementation Plan: ItemDetailModal Received/Published Display Refinement

## Phase 1: Research and Preparation
- [ ] Task: Verify existing icon usage
    - Check for established icon libraries (e.g., Lucide) or patterns in the project.
- [ ] Task: Confirm Panda CSS breakpoints
    - Inspect `panda.config.ts` to ensure 480px corresponds to an existing breakpoint (like `sm`).

## Phase 2: Implementation
- [ ] Task: Define/Import Icons
    - Select and import icons for "Published" and "Received".
- [ ] Task: Update `ItemDetailModal` Styling
    - Implement responsive logic using Panda CSS to swap text for icons at the 480px threshold.
    - Add tooltips or `title` attributes for accessibility and clarity.
- [ ] Task: Conductor - User Manual Verification 'Phase 2: Implementation' (Protocol in workflow.md)

## Phase 3: Verification
- [ ] Task: Add Unit Tests
    - Update `ItemDetailModal.test.tsx` to verify responsive behavior at different viewport widths.
- [ ] Task: Manual Verification
    - Launch dev server and test layout transitions in browser dev tools.
- [ ] Task: Conductor - User Manual Verification 'Phase 3: Verification' (Protocol in workflow.md)
