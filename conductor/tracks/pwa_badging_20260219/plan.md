# Implementation Plan: PWA Badging API Support

Enable the Badging API to display the total unread count on the application icon.

## Phase 1: Implementation

- [x] Task: Create `PwaBadge` component e0a5556
    - Create `frontend/src/components/PwaBadge.tsx`.
    - Implement logic using `createEffect` to call `navigator.setAppBadge` when `unreadCount > 0` and `navigator.clearAppBadge` when `unreadCount === 0`.
    - Ensure it handles cases where the API is not supported.
- [ ] Task: Integrate `PwaBadge` into the root route
    - Update `frontend/src/routes/__root.tsx` to include the `<PwaBadge />` component.
    - Pass the total unread count from the existing live query to the component.
- [ ] Task: Conductor - User Manual Verification 'Phase 1: Implementation' (Protocol in workflow.md)

## Phase 2: Testing and Refinement

- [ ] Task: Create unit tests for `PwaBadge`
    - Create `frontend/src/components/PwaBadge.test.tsx`.
    - Mock `navigator.setAppBadge` and `navigator.clearAppBadge`.
    - Verify that the API is called correctly with different unread counts.
    - Verify that it doesn't crash in environments where the API is missing.
- [ ] Task: Refine display limit logic
    - Based on the spec, ensure that very high counts are handled gracefully (either by the browser or by capping the value passed to the API).
- [ ] Task: Conductor - User Manual Verification 'Phase 2: Testing and Refinement' (Protocol in workflow.md)
