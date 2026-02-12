# Implementation Plan: Item Navigation Inclusion of Read Items

This plan outlines the steps to modify the item navigation logic in `ItemDetailModal` to include read items, synchronizing with the items currently visible in the `ItemList`.

## Phase 1: Research and Test Preparation [checkpoint: 5b4c9a0]
- [x] Task: Investigate current navigation state management in `frontend/src/components/ItemDetailModal.tsx` and related hooks/stores. e5fafb1
- [x] Task: Identify how `ItemList` provides the current item sequence to `ItemDetailModal`. e5fafb1
- [x] Task: Write a failing test in `frontend/src/components/ItemDetailModal.Navigation.test.tsx` that demonstrates the inability to navigate to a read item. e5fafb1
- [x] Task: Conductor - User Manual Verification 'Phase 1: Research and Test Preparation' (Protocol in workflow.md) e5fafb1

## Phase 2: Implementation of Navigation Logic [checkpoint: 5b4c9a0]
- [x] Task: Modify the data sourcing for `ItemDetailModal` navigation to use the full list of items from the `ItemList` context/store. e5fafb1
- [x] Task: Update the "Next" and "Previous" logic to find the index within the unfiltered (but sorted/filtered by search) visible list. e5fafb1
- [x] Task: Ensure that items marked as "read" in the current session are not filtered out of the navigation array. e5fafb1
- [x] Task: Verify that the failing navigation tests now pass. e5fafb1
- [x] Task: Conductor - User Manual Verification 'Phase 2: Implementation of Navigation Logic' (Protocol in workflow.md) e5fafb1

## Phase 3: UI/UX Verification and Refinement
- [x] Task: Manually verify navigation in the browser, ensuring "Previous" works for just-read items. 3f78cef
- [x] Task: Check edge cases: navigation at the start/end of the list, and navigation when filters are active. 3f78cef
- [x] Task: Run existing tests to ensure no regressions in `ItemDetailModal` or `ItemList`. 3f78cef
- [x] Task: Conductor - User Manual Verification 'Phase 3: UI/UX Verification and Refinement' (Protocol in workflow.md) 3f78cef
