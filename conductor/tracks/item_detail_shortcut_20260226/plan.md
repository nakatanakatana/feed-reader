# Implementation Plan: Keyboard Shortcut for Read/Unread Toggle

## Phase 1: Preparation and Environment Setup
- [x] Task: Identify the `ItemDetailModal` component and its current event handling logic.
- [x] Task: Research existing keyboard shortcut implementations in the project (if any) to ensure consistency.

## Phase 2: Implementation of Keyboard Shortcut
- [x] Task: Write Failing Tests (Red Phase)
    - [x] Create a new test case in `ItemDetailModal.test.tsx` (or similar) to verify the `m` shortcut.
    - [x] Verify that pressing `m` calls the toggle function.
    - [x] Verify that the state updates and is announced to screen readers.
- [x] Task: Implement to Pass Tests (Green Phase)
    - [x] Add a `keydown` event listener to the `ItemDetailModal`.
    - [x] Implement the logic to detect `m`/`M` and trigger the toggle.
    - [x] Ensure the listener is properly removed when the modal is unmounted.
    - [x] Add ARIA live region support for status change announcements.
- [x] Task: Refactor (Optional)
    - [x] Clean up event listener logic if needed.
- [x] Task: Conductor - User Manual Verification 'Phase 2' (Protocol in workflow.md)

## Phase 3: Validation and Quality Assurance
- [x] Task: Verify that the shortcut doesn't conflict with any browser defaults or other UI elements (like input fields).
- [x] Task: Ensure the shortcut is scoped only to when the modal is open.
- [x] Task: Verify code coverage for the new logic (>80%).
- [x] Task: Conductor - User Manual Verification 'Phase 3' (Protocol in workflow.md)
