# Implementation Plan - Content Color Mode Support

## Phase 1: Implementation
- [x] Task: Create reproduction/test case in `ItemDetailModal.tsx` e940d7d
    - [ ] Create a test that renders `ItemDetailModal` with content containing `#gh-light-mode-only` and `#gh-dark-mode-only` elements.
    - [ ] Assert that initially (without the new styles), both or neither might be visible depending on defaults, failing the specific visibility requirements for each mode.
- [x] Task: Implement CSS for Color Mode Support e940d7d
    - [ ] Update `frontend/src/components/ItemDetailModal.tsx` to include Panda CSS styles.
    - [ ] Define `@media (prefers-color-scheme: light)` block to show `#gh-light-mode-only` and hide `#gh-dark-mode-only`.
    - [ ] Define `@media (prefers-color-scheme: dark)` block to show `#gh-dark-mode-only` and hide `#gh-light-mode-only`.
    - [ ] Ensure selectors are strictly scoped to the article content container.
- [x] Task: Verify Implementation e940d7d
    - [ ] Run the tests again to confirm they pass with the new styles applied.
- [ ] Task: Conductor - User Manual Verification 'Phase 1: Implementation' (Protocol in workflow.md)
