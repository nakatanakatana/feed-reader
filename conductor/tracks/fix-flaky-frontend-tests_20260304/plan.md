# Implementation Plan: Fix Flaky Frontend Tests

## Phase 1: Research and Reproduction
This phase focuses on identifying the root cause and reproducing the flakiness.

- [x] Task: Reproduce flakiness in `ItemDetailModal.ImageLayout.test.tsx` locally. (ff616c8)
    - [x] Run the specific test multiple times using `npm run test:frontend -- frontend/src/components/ItemDetailModal.ImageLayout.test.tsx` (or equivalent).
- [x] Task: Scan for similar patterns in other frontend tests. (ff616c8)
    - [x] Grep for `toHaveStyle` and other layout-dependent assertions in `frontend/src/**/*.test.tsx`.
    - [x] Run identified tests multiple times to check for flakiness.
- [x] Task: Analyze the root cause of the failures. (ff616c8)
    - [x] Inspect the failed test reports and logs.
    - [x] Check if the issues are related to Vitest Browser Mode timing or CSS rendering.
- [x] Task: Conductor - User Manual Verification 'Research and Reproduction' (Protocol in workflow.md) (ff616c8)

## Phase 2: Implementation of Fixes
This phase involves applying the TDD workflow to fix the flaky tests.

- [x] Task: Fix flakiness in `ItemDetailModal.ImageLayout.test.tsx`. (ff616c8)
    - [x] Write/refine the test case to be more resilient to timing (Red Phase - confirm it still fails intermittently).
    - [x] Implement the fix (e.g., using `waitFor`, increasing timeouts, or ensuring styles are applied) (Green Phase).
- [x] Task: Fix other identified flaky tests (if any). (ff616c8)
    - [x] Apply similar TDD logic to other components found in Phase 1.
- [x] Task: Conductor - User Manual Verification 'Implementation of Fixes' (Protocol in workflow.md) (ff616c8)

## Phase 3: Final Verification and Stability Check
This phase ensures the fixes are stable and don't introduce regressions.

- [x] Task: Perform multiple stress runs of the entire frontend test suite. (ff616c8)
    - [x] Run `npm run test:frontend` at least 5-10 times to ensure no intermittent failures remain.
- [x] Task: Verify that the CI environment (GitHub Actions) passes consistently. (ff616c8)
- [x] Task: Conductor - User Manual Verification 'Final Verification and Stability Check' (Protocol in workflow.md) (ff616c8)
