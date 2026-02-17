# Implementation Plan - Track: Fix Mark as Unread Button in ItemDetailModal

## Phase 1: Analysis & Reproduction
- [ ] Task: Analyze `frontend/src/components/ItemDetailModal.tsx` and `frontend/src/components/ItemDetailModal.Logic.test.tsx` (or similar) to understand the current rendering logic for the action button.
- [ ] Task: Create a reproduction test case (e.g., in `frontend/src/components/ItemDetailModal.Reproduction.test.tsx`) that sets up a "Read" item and asserts the "Mark as Unread" button is visible.
    -   *Success Criteria:* The test must fail (Red Phase).

## Phase 2: Implementation (Fix)
- [ ] Task: Modify `frontend/src/components/ItemDetailModal.tsx` to correctly toggle the button between "Mark as Read" and "Mark as Unread" based on the item's state.
- [ ] Task: Verify the reproduction test passes (Green Phase).
- [ ] Task: Run all `ItemDetailModal` related tests to ensure no regressions.
- [ ] Task: Conductor - User Manual Verification 'Implementation' (Protocol in workflow.md)

## Phase 3: Final Polish & Merge
- [ ] Task: Run linting and type-checking on the frontend (`npm run lint`, `npm run type-check` or equivalent).
- [ ] Task: Conductor - User Manual Verification 'Final Polish' (Protocol in workflow.md)
