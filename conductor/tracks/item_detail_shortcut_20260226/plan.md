# Implementation Plan: Keyboard Shortcut for Read/Unread Toggle

## Phase 1: Preparation and Environment Setup
- [x] Task: Identify the `ItemDetailModal` component and its current event handling logic. 3217dd0
- [x] Task: Research existing keyboard shortcut implementations in the project (if any) to ensure consistency. 3217dd0

## Phase 2: Implementation of Keyboard Shortcut
- [x] Task: Write Failing Tests (Red Phase) 3217dd0
    - [x] Create a new test case in `ItemDetailModal.test.tsx` (or similar) to verify the `m` shortcut. 3217dd0
    - [x] Verify that pressing `m` calls the toggle function. 3217dd0
    - [x] Verify that the state updates and is announced to screen readers. 3217dd0
- [x] Task: Implement to Pass Tests (Green Phase) 3217dd0
    - [x] Add a `keydown` event listener to the `ItemDetailModal`. 3217dd0
    - [x] Implement the logic to detect `m`/`M` and trigger the toggle. 3217dd0
    - [x] Ensure the listener is properly removed when the modal is unmounted. 3217dd0
    - [x] Add ARIA live region support for status change announcements. 3217dd0
- [x] Task: Refactor (Optional) 3217dd0
    - [x] Clean up event listener logic if needed. 3217dd0
- [x] Task: Conductor - User Manual Verification 'Phase 2' (Protocol in workflow.md) 3217dd0

## Phase 3: Validation and Quality Assurance
- [x] Task: Verify that the shortcut doesn't conflict with any browser defaults or other UI elements (like input fields). 3217dd0
- [x] Task: Ensure the shortcut is scoped only to when the modal is open. 3217dd0
- [x] Task: Verify code coverage for the new logic (>80%). 3217dd0
- [x] Task: Conductor - User Manual Verification 'Phase 3' (Protocol in workflow.md) 3217dd0
