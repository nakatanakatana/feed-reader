# Implementation Plan: Fix ItemDetailModal Read/Unread FAB State

Fix the bug where the Read/Unread FAB in `ItemDetailModal` does not correctly reflect the item's state by prioritizing the `items` collection data.

## Phase 1: Research and Reproduction
- [ ] Task: Research existing `ItemDetailModal` and `items` collection implementation.
    - [ ] Locate `ItemDetailModal.tsx` and identify the FAB state logic.
    - [ ] Locate the `items` collection definition (likely in a store or hook).
- [ ] Task: Create a reproduction test case.
    - [ ] Write a Vitest test in `frontend/src/components/ItemDetailModal.test.tsx` (or similar) that demonstrates the FAB showing "Mark as Read" even for an already read item.

## Phase 2: Implementation
- [ ] Task: Update `ItemDetailModal` to use prioritized data source.
    - [ ] Modify `ItemDetailModal` to look up the item in the `items` collection by ID.
    - [ ] Implement fallback logic to use the fetched detail data if the item is not in the collection.
- [ ] Task: Implement synchronized state update.
    - [ ] Update the FAB's click handler to use `items().update` (or the equivalent collection update method).
    - [ ] Ensure the FAB's icon and label reactively update based on the prioritized data.

## Phase 3: Verification and Refinement
- [ ] Task: Verify the fix with tests.
    - [ ] Run the reproduction test and ensure it passes.
    - [ ] Add a test case for the deep link scenario (fallback to detail data).
- [ ] Task: Manual Verification.
    - [ ] Verify that marking an item as read in the modal updates the list view.
    - [ ] Verify that the FAB correctly shows "Mark as Unread" for read items.
- [ ] Task: Conductor - User Manual Verification 'Phase 3: Verification and Refinement' (Protocol in workflow.md)
