# Implementation Plan: Prevent Item Detail from polluting browser history

## Phase 1: Test Case Preparation (Red Phase)
- [ ] Task: Create integration tests to verify history behavior when navigating to item details
    - [ ] Create `frontend/src/routes_test/item_history.test.tsx`
    - [ ] Write a test to verify that clicking an item in the list uses `replace` (history length does not increase)
    - [ ] Write a test to verify that navigating between items in the modal uses `replace`
    - [ ] Write a test to verify that the browser's back button returns to the list view
- [ ] Task: Run tests and confirm failure (Red Phase)
- [ ] Task: Conductor - User Manual Verification 'Phase 1: Test Case Preparation' (Protocol in workflow.md)

## Phase 2: Implementation (Green Phase)
- [ ] Task: Modify `ItemList.tsx` to use history replacement when navigating to item details
    - [ ] Update `handleItemClick` in `frontend/src/components/ItemList.tsx` to use `replace: true`
- [ ] Task: Update routing logic to ensure sequential navigation within the modal also uses replacement
    - [ ] Analyze `ItemDetailRouteView.tsx` or relevant route components to ensure `navigate` calls use `replace: true`
- [ ] Task: Verify implementation with tests (Green Phase)
    - [ ] Run `vitest` and ensure all new tests pass
- [ ] Task: Conductor - User Manual Verification 'Phase 2: Implementation' (Protocol in workflow.md)

## Phase 3: Refactoring and Quality Check
- [ ] Task: Refactor and optimize navigation logic if necessary
- [ ] Task: Ensure all Quality Gates are met (linting, type safety, mobile responsiveness)
- [ ] Task: Conductor - User Manual Verification 'Phase 3: Refactoring and Quality Check' (Protocol in workflow.md)
