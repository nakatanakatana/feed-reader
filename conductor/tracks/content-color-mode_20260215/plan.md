# Implementation Plan - Content Color Mode Support

## Phase 1: Implementation [checkpoint: 4eaec14]
- [x] Task: Create reproduction/test case in `ItemDetailModal.tsx` e940d7d
    - [x] Create a test that renders `ItemDetailModal` with content containing `#gh-light-mode-only` and `#gh-dark-mode-only` elements.
    - [x] Assert that initially (without the new styles), both or neither might be visible depending on defaults, failing the specific visibility requirements for each mode.
- [x] Task: Implement CSS for Color Mode Support e940d7d
    - [x] Update `frontend/src/components/ItemDetailModal.tsx` to include Panda CSS styles.
    - [x] Define `@media (prefers-color-scheme: light)` block to show `#gh-light-mode-only` and hide `#gh-dark-mode-only`.
    - [x] Define `@media (prefers-color-scheme: dark)` block to show `#gh-dark-mode-only` and hide `#gh-light-mode-only`.
    - [x] Ensure selectors are strictly scoped to the article content container.
- [x] Task: Verify Implementation e940d7d
    - [x] Run the tests again to confirm they pass with the new styles applied.
- [x] Task: Conductor - User Manual Verification 'Phase 1: Implementation' (Protocol in workflow.md)
