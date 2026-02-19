# Implementation Plan: ItemDetailModal Received/Published Display Refinement

## Phase 1: Research and Preparation
- [x] Task: Verify existing icon usage
    - Check for established icon libraries (e.g., Lucide) or patterns in the project.
- [x] Task: Confirm Panda CSS breakpoints
    - Inspect `panda.config.ts` to ensure 480px corresponds to an existing breakpoint (like `sm`). Added `xs: 480px` to `panda.config.ts`.

## Phase 2: Implementation
- [x] Task: Define/Import Icons
    - Select and import icons for "Published" and "Received".
- [x] Task: Update `ItemDetailModal` Styling
    - Implement responsive logic using Panda CSS to swap text for icons at the 480px threshold.
    - Add tooltips or `title` attributes for accessibility and clarity.
- [x] Task: Conductor - User Manual Verification 'Phase 2: Implementation'
    - Implementation of icons and responsive logic completed and linted.

## Phase 3: Verification [checkpoint: b9ed48c]
- [x] Task: Add Unit Tests
    - Update `ItemDetailModal.test.tsx` to verify responsive behavior at different viewport widths. Verified with a new test case in `ItemDetailModal.Responsive.test.tsx`.
- [x] Task: Manual Verification
    - Launch dev server and test layout transitions in browser dev tools.
- [x] Task: Conductor - User Manual Verification 'Phase 3: Verification' (Protocol in workflow.md) b9ed48c
