# Implementation Plan: Fix Flaky Frontend Tests

## Phase 1: Research and Reproduction
This phase focuses on identifying the root cause and reproducing the flakiness.

- [ ] Task: Reproduce flakiness in `ItemDetailModal.ImageLayout.test.tsx` locally.
    - [ ] Run the specific test multiple times using `npm run test:frontend -- frontend/src/components/ItemDetailModal.ImageLayout.test.tsx` (or equivalent).
- [ ] Task: Scan for similar patterns in other frontend tests.
    - [ ] Grep for `toHaveStyle` and other layout-dependent assertions in `frontend/src/**/*.test.tsx`.
    - [ ] Run identified tests multiple times to check for flakiness.
- [ ] Task: Analyze the root cause of the failures.
    - [ ] Inspect the failed test reports and logs.
    - [ ] Check if the issues are related to Vitest Browser Mode timing or CSS rendering.
- [ ] Task: Conductor - User Manual Verification 'Research and Reproduction' (Protocol in workflow.md)

## Phase 2: Implementation of Fixes
This phase involves applying the TDD workflow to fix the flaky tests.

- [ ] Task: Fix flakiness in `ItemDetailModal.ImageLayout.test.tsx`.
    - [ ] Write/refine the test case to be more resilient to timing (Red Phase - confirm it still fails intermittently).
    - [ ] Implement the fix (e.g., using `waitFor`, increasing timeouts, or ensuring styles are applied) (Green Phase).
- [ ] Task: Fix other identified flaky tests (if any).
    - [ ] Apply similar TDD logic to other components found in Phase 1.
- [ ] Task: Conductor - User Manual Verification 'Implementation of Fixes' (Protocol in workflow.md)

## Phase 3: Final Verification and Stability Check
This phase ensures the fixes are stable and don't introduce regressions.

- [ ] Task: Perform multiple stress runs of the entire frontend test suite.
    - [ ] Run `npm run test:frontend` at least 5-10 times to ensure no intermittent failures remain.
- [ ] Task: Verify that the CI environment (GitHub Actions) passes consistently.
- [ ] Task: Conductor - User Manual Verification 'Final Verification and Stability Check' (Protocol in workflow.md)
