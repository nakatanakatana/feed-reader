# Implementation Plan: ItemDetailModal Focus Trap Enhancement

## Phase 1: Test Case Preparation (Red Phase)
- [ ] Task: Create a reproduction test case for focus loss during navigation
    - [ ] Analyze existing `ItemDetailModal.Navigation.test.tsx` for testing patterns
    - [ ] Create a new test file `frontend/src/components/ItemDetailModal.Focus.test.tsx`
    - [ ] Write a test that simulates clicking "Next" and verifies that `document.activeElement` remains inside the modal or is the modal container
    - [ ] Verify that the test fails (Red Phase)
- [ ] Task: Conductor - User Manual Verification 'Phase 1: Test Case Preparation' (Protocol in workflow.md)

## Phase 2: Implement Focus Trap and Re-focusing (Green Phase)
- [ ] Task: Enhance the `Modal` component to support robust focus trapping
    - [ ] Implement a focus trap mechanism that prevents Tab focus from leaving the modal
    - [ ] Ensure the modal container is focusable and receives focus on mount
- [ ] Task: Implement automatic re-focusing in `ItemDetailModal`
    - [ ] Add an effect to `ItemDetailModal` that re-focuses the modal container whenever `props.itemId` changes
    - [ ] Verify that the tests created in Phase 1 now pass (Green Phase)
- [ ] Task: Conductor - User Manual Verification 'Phase 2: Implement Focus Trap and Re-focusing' (Protocol in workflow.md)

## Phase 3: Final Verification and Documentation
- [ ] Task: Verify overall accessibility and performance
    - [ ] Ensure Tab navigation works correctly within the modal (cycles through buttons)
    - [ ] Verify that the fix doesn't introduce any performance regressions in modal transitions
    - [ ] Check code coverage for the new focus logic (>80%)
- [ ] Task: Conductor - User Manual Verification 'Phase 3: Final Verification' (Protocol in workflow.md)
