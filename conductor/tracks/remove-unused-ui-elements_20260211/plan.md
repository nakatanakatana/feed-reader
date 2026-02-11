# Implementation Plan: remove-unused-ui-elements

This plan outlines the steps to remove redundant UI elements from the `ItemDetailModal` and `ItemRow` components, adjust layouts, and clean up associated logic and tests.

## Phase 1: Investigation & Test Identification [checkpoint: 4a1a9b9]
- [x] Task: Identify specific code locations for "Previous/Next" buttons in `ItemDetailModal`.
- [x] Task: Identify specific code locations for "Mark as Read" buttons in `ItemRow`.
- [x] Task: List all Vitest files that test these buttons (e.g., `ItemDetailModal.test.tsx`, `ItemRow.test.tsx`).
- [x] Task: Conductor - User Manual Verification 'Phase 1: Investigation' (Protocol in workflow.md)

## Phase 2: Component Modification & Layout Adjustment [checkpoint: 7c85249]
- [x] Task: Remove "Previous/Next" buttons from `ItemDetailModal.tsx` and adjust Panda CSS styles to reclaim space. [e7f2eb7]
- [x] Task: Remove "Mark as Read" button from `ItemRow.tsx` and adjust Panda CSS styles for title/date expansion. [e7f2eb7]
- [x] Task: Verify UI appearance in browser (manual check) to ensure layouts are clean and responsive. [6aa8c6e]
- [x] Task: Conductor - User Manual Verification 'Phase 2: UI Modification' (Protocol in workflow.md) [7c85249]

## Phase 3: Logic Cleanup [checkpoint: ec968bd]
- [x] Task: Identify and remove helper functions or state variables in components that were only used by the deleted buttons. [ec968bd]
- [x] Task: Ensure that keyboard shortcut logic (navigation/marking as read) remains intact and functional. [ec968bd]
- [x] Task: Conductor - User Manual Verification 'Phase 3: Logic Cleanup' (Protocol in workflow.md) [ec968bd]

## Phase 4: Test Maintenance & Verification [checkpoint: b8e18b1]
- [x] Task: Remove or update identified test cases in Vitest files that depend on the deleted buttons. [b8e18b1]
- [x] Task: Run `npm run test` (or equivalent) to ensure all tests pass and no regressions were introduced in keyboard shortcuts. [b8e18b1]
- [x] Task: Run `npm run lint` and `npm run type-check` to ensure code quality. [b8e18b1]
- [x] Task: Conductor - User Manual Verification 'Phase 4: Verification' (Protocol in workflow.md) [b8e18b1]

## Track Completion
All tasks for the "remove-unused-ui-elements" track are finished. Redundant UI elements have been removed while preserving full functionality via keyboard shortcuts and bulk actions. Layouts have been adjusted to reclaim space and ensure responsiveness. All tests pass and linting/type-checking is clean.
