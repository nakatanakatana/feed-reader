# Implementation Plan: Prevent Item Detail from polluting browser history

## Phase 1: Test Case Preparation (Red Phase)
- [x] Task: Create integration tests to verify history behavior when navigating to item details 548764d
    - [x] Create `frontend/src/routes_test/item_history.test.tsx`
    - [x] Write a test to verify that clicking an item in the list uses `replace` (history length does not increase)
    - [x] Write a test to verify that navigating between items in the modal uses `replace`
    - [x] Write a test to verify that the browser's back button returns to the list view
- [x] Task: Run tests and confirm failure (Red Phase) 548764d
- [x] Task: Conductor - User Manual Verification 'Phase 1: Test Case Preparation' (Protocol in workflow.md) 548764d

## Phase 2: Implementation (Green Phase)
- [x] Task: Modify `ItemList.tsx` to use history replacement when navigating to item details 548764d
    - [x] Update `handleItemClick` in `frontend/src/components/ItemList.tsx` to use `replace: true`
- [x] Task: Update routing logic to ensure sequential navigation within the modal also uses replacement 548764d
    - [x] Analyze `ItemDetailRouteView.tsx` or relevant route components to ensure `navigate` calls use `replace: true`
- [x] Task: Verify implementation with tests (Green Phase) 548764d
- [x] Task: Conductor - User Manual Verification 'Phase 2: Implementation' (Protocol in workflow.md) 548764d

## Phase 3: Refactoring and Quality Check
- [x] Task: Refactor and optimize navigation logic if necessary 9373bd9
- [x] Task: Ensure all Quality Gates are met (linting, type safety, mobile responsiveness) 9373bd9
- [x] Task: Conductor - User Manual Verification 'Phase 3: Refactoring and Quality Check' (Protocol in workflow.md) 9373bd9
