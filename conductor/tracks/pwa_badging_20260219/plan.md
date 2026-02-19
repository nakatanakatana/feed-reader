# Implementation Plan: PWA Badging API Support

Enable the Badging API to display the total unread count on the application icon.

## Phase 1: Implementation [checkpoint: e05e242]

- [x] Task: Create `PwaBadge` component e0a5556
    - Create `frontend/src/components/PwaBadge.tsx`.
    - Implement logic using `createEffect` to call `navigator.setAppBadge` when `unreadCount > 0` and `navigator.clearAppBadge` when `unreadCount === 0`.
    - Ensure it handles cases where the API is not supported.
- [x] Task: Integrate `PwaBadge` into the root route c605049
    - Update `frontend/src/routes/__root.tsx` to include the `<PwaBadge />` component.
    - Pass the total unread count from the existing live query to the component.
- [x] Task: Conductor - User Manual Verification 'Phase 1: Implementation' (Protocol in workflow.md)

## Phase 2: Testing and Refinement

- [x] Task: Create unit tests for `PwaBadge` e0a5556
    - Create `frontend/src/components/PwaBadge.test.tsx`.
    - Mock `navigator.setAppBadge` and `navigator.clearAppBadge`.
    - Verify that the API is called correctly with different unread counts.
    - Verify that it doesn't crash in environments where the API is missing.
- [x] Task: Refine display limit logic 3d1fc8d
    - Based on the spec, ensure that very high counts are handled gracefully (either by the browser or by capping the value passed to the API).
- [x] Task: Conductor - User Manual Verification 'Phase 2: Testing and Refinement' (Protocol in workflow.md)
