# Implementation Plan: Keyboard Shortcut for Read/Unread Toggle

## Phase 1: Preparation and Environment Setup
- [ ] Task: Identify the `ItemDetailModal` component and its current event handling logic.
- [ ] Task: Research existing keyboard shortcut implementations in the project (if any) to ensure consistency.

## Phase 2: Implementation of Keyboard Shortcut
- [ ] Task: Write Failing Tests (Red Phase)
    - [ ] Create a new test case in `ItemDetailModal.test.tsx` (or similar) to verify the `m` shortcut.
    - [ ] Verify that pressing `m` calls the toggle function.
    - [ ] Verify that the state updates and is announced to screen readers.
- [ ] Task: Implement to Pass Tests (Green Phase)
    - [ ] Add a `keydown` event listener to the `ItemDetailModal`.
    - [ ] Implement the logic to detect `m`/`M` and trigger the toggle.
    - [ ] Ensure the listener is properly removed when the modal is unmounted.
    - [ ] Add ARIA live region support for status change announcements.
- [ ] Task: Refactor (Optional)
    - [ ] Clean up event listener logic if needed.
- [ ] Task: Conductor - User Manual Verification 'Phase 2' (Protocol in workflow.md)

## Phase 3: Validation and Quality Assurance
- [ ] Task: Verify that the shortcut doesn't conflict with any browser defaults or other UI elements (like input fields).
- [ ] Task: Ensure the shortcut is scoped only to when the modal is open.
- [ ] Task: Verify code coverage for the new logic (>80%).
- [ ] Task: Conductor - User Manual Verification 'Phase 3' (Protocol in workflow.md)
