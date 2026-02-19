# Implementation Plan: Item List Date Display & Responsive Icons

Standardize the date display in `ItemRow` (used within `ItemList`) by reordering "Published" and "Received" dates and implementing responsive iconization to match `ItemDetailModal`.

## Phase 1: Preparation and TDD Setup
- [x] Task: Research existing icon implementation in `ItemDetailModal.tsx` and identify potential for refactoring or reuse.
- [x] Task: Create a new test file `frontend/src/components/ItemRow.ResponsiveDate.test.tsx` to verify the date order and responsive icon display. 805bc7a
    - [x] Sub-task: Write a test ensuring "Published" comes before "Received" in the UI.
    - [x] Sub-task: Write a test verifying that text labels ("Published:", "Received:") are visible at desktop widths.
    - [x] Sub-task: Write a test verifying that text labels are hidden and icons are visible at narrow widths (< 480px).
    - [x] Sub-task: Verify tests fail as expected (Red Phase).

## Phase 2: Implementation
- [ ] Task: Refactor `PublishedIcon` and `ReceivedIcon` from `ItemDetailModal.tsx` into a shared location if appropriate, or duplicate for now if minimal.
- [ ] Task: Update `ItemRow.tsx` to reorder dates: "Published" followed by "Received".
- [ ] Task: Implement responsive logic in `ItemRow.tsx` using Panda CSS (same as `ItemDetailModal.tsx`) to switch between text labels and icons at the `xs` breakpoint.
- [ ] Task: Add tooltips to the icons in `ItemRow.tsx` for accessibility and information parity.
- [ ] Task: Run tests and ensure they pass (Green Phase).
- [ ] Task: Refactor and clean up code.
- [ ] Task: Conductor - User Manual Verification 'Phase 2: Implementation' (Protocol in workflow.md)

## Phase 3: Final Verification
- [ ] Task: Verify that `ItemDetailModal` remains unaffected and functional.
- [ ] Task: Run all frontend tests to ensure no regressions.
- [ ] Task: Check code coverage for `ItemRow.tsx` and related changes.
