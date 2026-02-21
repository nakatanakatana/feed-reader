# Implementation Plan - UI Adjustment for Blocking & Parsing Rules

## Phase 1: Blocking Rules - Modal & Actions
Focus on moving the bulk import functionality to a modal and adding the trigger button.

- [x] Task: Create `BulkImportBlockingRulesModal` component 76819e6
    - [ ] Create failing test for modal rendering and submission logic
    - [ ] Implement the modal component using existing UI primitives
    - [ ] Verify tests pass
- [ ] Task: Integrate Modal into `BlockingRulesPage`
    - [ ] Update `BlockingRulesPage` test to verify the "Bulk Import" button exists and opens the modal
    - [ ] Add "Bulk Import" button to the right of "Add Rule" button
    - [ ] Implement state logic to control modal visibility
    - [ ] Ensure success callback closes the modal and triggers a toast
    - [ ] Verify tests pass
- [ ] Task: Conductor - User Manual Verification 'Phase 1: Blocking Rules - Modal & Actions' (Protocol in workflow.md)

## Phase 2: List Layout Standardization
Focus on updating the list layout for both Blocking and Parsing rules to match the Feeds page style (full width, independent scroll).

- [ ] Task: Refactor `BlockingRulesPage` Layout
    - [ ] Update tests to verify layout structure (sticky header, scrollable list container)
    - [ ] Implement full-width container for the list
    - [ ] Apply CSS/Styling for independent scrolling of the list area
    - [ ] Verify tests pass
- [ ] Task: Refactor `ParsingRulesPage` Layout
    - [ ] Update tests to verify layout structure
    - [ ] Implement full-width container for the parsing rules list
    - [ ] Apply CSS/Styling for independent scrolling
    - [ ] Verify tests pass
- [ ] Task: Conductor - User Manual Verification 'Phase 2: List Layout Standardization' (Protocol in workflow.md)
