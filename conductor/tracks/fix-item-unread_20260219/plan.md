# Implementation Plan: Fix ItemDetailModal Read/Unread FAB State

Fix the bug where the Read/Unread FAB in `ItemDetailModal` does not correctly reflect the item's state by prioritizing the `items` collection data.

## Phase 1: Research and Reproduction
- [x] Task: Research existing `ItemDetailModal` and `items` collection implementation. [c064248]
    - [x] Locate `ItemDetailModal.tsx` and identify the FAB state logic.
    - [x] Locate the `items` collection definition (likely in a store or hook).
- [x] Task: Create a reproduction test case. [c064248]
    - [x] Write a Vitest test in `frontend/src/components/ItemDetailModal.test.tsx` (or similar) that demonstrates the FAB showing "Mark as Read" even for an already read item.

## Phase 2: Implementation
- [x] Task: Update `ItemDetailModal` to use prioritized data source. [c064248]
    - [x] Modify `ItemDetailModal` to look up the item in the `items` collection by ID.
    - [x] Implement fallback logic to use the fetched detail data if the item is not in the collection.
- [x] Task: Implement synchronized state update. [c064248]
    - [x] Update the FAB's click handler to use `items().update` (or the equivalent collection update method).
    - [x] Ensure the FAB's icon and label reactively update based on the prioritized data.

## Phase 3: Verification and Refinement
- [x] Task: Verify the fix with tests. [c064248]
    - [x] Run the reproduction test and ensure it passes.
    - [x] Add a test case for the deep link scenario (fallback to detail data).
- [x] Task: Manual Verification. [c064248]
    - [x] Verify that marking an item as read in the modal updates the list view.
    - [x] Verify that the FAB correctly shows "Mark as Unread" for read items.
- [ ] Task: Conductor - User Manual Verification 'Phase 3: Verification and Refinement' (Protocol in workflow.md)
