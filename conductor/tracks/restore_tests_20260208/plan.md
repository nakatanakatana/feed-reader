# Implementation Plan - Refactor Frontend Tests and Restore Skipped Tests

## Phase 1: Test Infrastructure Enhancement [checkpoint: 47db490]
Standardize MSW setup and prepare the environment to test with the actual `tanstack/db` instead of mocks.

- [x] Task: Audit skipped tests and current mocks. (a266934)
    - [x] List all skipped tests in `frontend/src/components` and `frontend/src/lib`.
    - [x] Identify files where `@tanstack/db` is being mocked.
- [x] Task: Standardize MSW handlers and server setup. (b192940)
    - [x] Review `frontend/src/mocks/handlers.ts` (or equivalent) to ensure it covers feed and item operations.
    - [x] Create/Update test utilities to easily reset `tanstack/db` state between tests.
- [x] Task: Conductor - User Manual Verification 'Phase 1: Test Infrastructure Enhancement' (47db490)

## Phase 2: Restore Feed Management Tests
Refactor tests related to adding and updating feeds to use MSW and actual application logic.

- [x] Task: Refactor `AddFeedForm.test.tsx` (or relevant tests). (979d22c)
    - [x] Remove mocks for `@tanstack/db` or custom store logic.
    - [x] Implement MSW handlers for feed creation.
    - [x] Verify the test passes with actual library logic.
- [x] Task: Refactor `FeedList` related tests. (979d22c)
    - [x] Ensure feed listing and updates are tested via MSW and real state.
- [ ] Task: Conductor - User Manual Verification 'Phase 2: Restore Feed Management Tests' (Protocol in workflow.md)

## Phase 3: Restore Article Status Management Tests
Restore tests related to toggling read/unread status of articles.

- [ ] Task: Refactor `ItemList` and `ItemRow` tests.
    - [ ] Remove article-related mocks.
    - [ ] Set up MSW handlers for marking items as read/unread.
    - [ ] Ensure state updates in `tanstack/db` are correctly reflected in the UI during tests.
- [ ] Task: Refactor `ItemDetailModal` tests.
    - [ ] Verify interactions within the detail view correctly trigger status updates.
- [ ] Task: Conductor - User Manual Verification 'Phase 3: Restore Article Status Management Tests' (Protocol in workflow.md)

## Phase 4: Final Cleanup and Verification
Ensure the entire test suite is stable and correctly verified.

- [ ] Task: Run all frontend tests and ensure no unintended regressions.
- [ ] Task: Verify that no `test.skip` or `describe.skip` remain for the target areas.
- [ ] Task: Final code quality and coverage check.
- [ ] Task: Conductor - User Manual Verification 'Phase 4: Final Cleanup and Verification' (Protocol in workflow.md)
