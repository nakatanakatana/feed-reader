# Implementation Plan - items-display-fix

This plan outlines the steps to investigate and fix the issue where news items are not displayed on the screen, and to add regression tests.

## Phase 1: Investigation and Root Cause Analysis
Goal: Identify why items are not being displayed by examining both frontend and backend.

- [x] Task: Investigate backend API/RPC response for items
    - [x] Check if the backend is correctly fetching items from the database.
    - [x] Verify the Connect RPC response for both all items and feed-specific items.
- [x] Task: Investigate frontend data fetching and rendering
    - [x] Inspect network requests in the browser to see if items are being received.
    - [x] Check the React component tree and state to see if data is correctly mapped to the UI.
- [x] Task: Conductor - User Manual Verification 'Phase 1: Investigation' (Protocol in workflow.md)

## Phase 2: Fix and Regression Testing
Goal: Implement the fix based on the investigation and ensure it works with automated tests.

- [~] Task: Create failing regression tests
    - [x] Write a test case (backend or frontend depending on the root cause) that reproduces the missing items issue.
    - [x] Confirm the test fails.
- [x] Task: Implement the fix
    - [x] Apply the necessary changes to the backend or frontend to ensure items are displayed.
- [x] Task: Verify the fix with tests
    - [x] Run the regression tests and ensure they pass.
    - [x] Ensure overall code coverage remains >80%.
- [x] Task: Conductor - User Manual Verification 'Phase 2: Fix and Regression Testing' (Protocol in workflow.md)

## Phase 3: Final Verification
Goal: Ensure the application is stable and the fix is verified in the browser.

- [x] Task: Run full test suite and linting
    - [x] Execute `go test ./...` and `npm test`.
    - [x] Run `golangci-lint` and `npm run lint`.
- [x] Task: Conductor - User Manual Verification 'Phase 3: Final Verification' (Protocol in workflow.md)
