# Implementation Plan - Track: Fix Mark as Unread Button in ItemDetailModal

## Phase 1: Analysis & Reproduction
- [x] Task: Analyze `frontend/src/components/ItemDetailModal.tsx` and `frontend/src/components/ItemDetailModal.Logic.test.tsx` (or similar) to understand the current rendering logic for the action button. b1a2c3d
- [x] Task: Create a reproduction test case (e.g., in `frontend/src/components/ItemDetailModal.Reproduction.test.tsx`) that sets up a "Read" item and asserts the "Mark as Unread" button is visible. 4045fe7
    -   *Success Criteria:* The test must fail (Red Phase).

## Phase 2: Implementation (Fix) [checkpoint: bab8724]
- [x] Task: Modify `frontend/src/components/ItemDetailModal.tsx` to correctly toggle the button between "Mark as Read" and "Mark as Unread" based on the item's state. 0e8ad2e
- [x] Task: Verify the reproduction test passes (Green Phase). 0e8ad2e
- [x] Task: Run all `ItemDetailModal` related tests to ensure no regressions. 0e8ad2e
- [x] Task: Conductor - User Manual Verification 'Implementation' (Protocol in workflow.md) bab8724

## Phase 3: Final Polish & Merge [checkpoint: 3735d42]
- [x] Task: Run linting and type-checking on the frontend (`npm run lint`, `npm run type-check` or equivalent). 3735d42
- [x] Task: Conductor - User Manual Verification 'Final Polish' (Protocol in workflow.md) 3735d42
