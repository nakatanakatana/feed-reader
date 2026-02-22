# Implementation Plan: Fix ItemList Horizontal Overflow

## Phase 1: Research and Reproduction
- [ ] Task: Identify the CSS responsible for the `ItemList` metadata layout.
- [ ] Task: Reproduce the horizontal overflow bug in a Vitest integration test (e.g., using a long domain name and narrow viewport).
- [ ] Task: Conductor - User Manual Verification 'Phase 1: Research and Reproduction' (Protocol in workflow.md)

## Phase 2: Implementation
- [ ] Task: Write failing CSS/layout tests that verify the overflow on narrow viewports.
- [ ] Task: Implement the `flex-wrap` fix and any necessary spacing adjustments in the ItemList component.
- [ ] Task: Verify that the tests now pass and the metadata wraps on narrow viewports.
- [ ] Task: Conductor - User Manual Verification 'Phase 2: Implementation' (Protocol in workflow.md)

## Phase 3: Validation and Refinement
- [ ] Task: Manually verify the fix on a narrow viewport using the browser's developer tools.
- [ ] Task: Check the layout on wide viewports to ensure no regressions.
- [ ] Task: Run full frontend test suite (`vitest`) to ensure overall stability.
- [ ] Task: Conductor - User Manual Verification 'Phase 3: Validation and Refinement' (Protocol in workflow.md)