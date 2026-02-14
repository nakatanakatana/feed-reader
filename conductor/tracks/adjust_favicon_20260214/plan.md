# Implementation Plan: Adjust Favicon Colors and Thresholds

## Phase 1: Update Core Logic and Constants
In this phase, we will modify the constants and the logic responsible for determining the favicon color based on the unread count.

- [x] Task: Update `FaviconColor` enum and `FAVICON_COLORS` constant in `frontend/src/lib/favicon.ts`. f61f3da
- [x] Task: Update `getFaviconColor` function logic in `frontend/src/lib/favicon.ts` to match the new thresholds. f61f3da
- [x] Task: Write/Update unit tests for `getFaviconColor` in `frontend/src/lib/favicon.test.ts`. f61f3da
- [ ] Task: Conductor - User Manual Verification 'Phase 1' (Protocol in workflow.md)

## Phase 2: Update Components and Integration Tests
In this phase, we will ensure the UI components correctly use the updated logic and verify the integration.

- [ ] Task: Verify and update `frontend/src/components/DynamicFavicon.tsx` to handle the removal of `Neutral` if necessary.
- [ ] Task: Update integration tests in `frontend/src/components/DynamicFavicon.test.tsx` to reflect the new colors and thresholds.
- [ ] Task: Update integration tests in `frontend/src/routes_test/root_favicon.test.tsx` to reflect the new colors and thresholds.
- [ ] Task: Conductor - User Manual Verification 'Phase 2' (Protocol in workflow.md)
