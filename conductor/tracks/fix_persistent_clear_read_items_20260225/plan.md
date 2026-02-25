# Implementation Plan: Fix Persistent Clear Read Items

## Phase 1: Research and Reproduction
- [ ] Task: Confirm the current behavior and reproduce the issue where cleared items reappear after a fetch.
    - [ ] Run the frontend in dev mode.
    - [ ] Add some items, mark them as read, and click "Clear Read Items".
    - [ ] Trigger a manual "Refresh" and verify that items reappear.
- [ ] Task: Identify the specific logic in the frontend code where "Clear Read Items" is handled and where TanStack Query/DB updates happen.
- [ ] Task: Conductor - User Manual Verification 'Research and Reproduction' (Protocol in workflow.md)

## Phase 2: Test Implementation (TDD Red)
- [ ] Task: Create a new integration test for the persistent "Clear Read Items" functionality.
    - [ ] Location: `frontend/src/components/ItemList.PersistentClear.test.tsx` (or appropriate existing file).
    - [ ] Write a test that simulates clicking "Clear Read Items", triggering a fetch, and confirming that items do NOT reappear.
    - [ ] Confirm that the test fails as expected.
- [ ] Task: Conductor - User Manual Verification 'Test Implementation (TDD Red)' (Protocol in workflow.md)

## Phase 3: Implementation (TDD Green)
- [ ] Task: Modify the "Clear Read Items" logic to ensure items are removed from the local state in a way that survives a re-fetch during the session.
    - [ ] Possible approach: Track cleared item IDs in a session-only list (SolidJS Store) and filter them out reactively.
- [ ] Task: Update the item listing queries or reactive stores to include filtering for the "cleared" IDs.
- [ ] Task: Verify that all tests pass.
- [ ] Task: Conductor - User Manual Verification 'Implementation (TDD Green)' (Protocol in workflow.md)

## Phase 4: Final Refactoring and Validation
- [ ] Task: Refactor the filtering logic for clarity and performance if needed.
- [ ] Task: Ensure that browser reload resets the cleared state as specified.
- [ ] Task: Run all project checks (lint, type-check, and all tests).
- [ ] Task: Conductor - User Manual Verification 'Final Refactoring and Validation' (Protocol in workflow.md)
