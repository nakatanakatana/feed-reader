# Implementation Plan - Global API Error Notification

## Phase 1: State and UI Integration
- [x] Task: Update `frontend/src/lib/toast.tsx` to expose a global `toast` object with `show`, `dismiss`, and `toasts`. This allows calling `show` from outside of SolidJS components (like API interceptors). 0a5cf12
- [x] Task: Ensure `ToastProvider` is updated to utilize this global reactive state so that existing `useToast` hooks still function correctly. 0a5cf12
- [~] Task: Conductor - User Manual Verification 'State and UI Integration' (Protocol in workflow.md)

## Phase 2: Global API Error Interception
- [ ] Task: Modify `frontend/src/lib/query.ts` to add global `onError` handlers to the `QueryClient`'s `QueryCache` and `MutationCache`.
- [ ] Task: These global handlers will call `toast.show("An error occurred. Please try again.", "error")` on failure.
- [ ] Task: Update `frontend/src/lib/query.ts` to add a Connect RPC Interceptor to the transport that catches non-OK response codes and triggers the same error toast.
- [ ] Task: Conductor - User Manual Verification 'Global API Error Interception' (Protocol in workflow.md)

## Phase 3: Testing and Refinement
- [ ] Task: Add new test cases to `frontend/src/lib/toast.test.tsx` to verify that triggering a global error (simulated) correctly shows the Toast notification.
- [ ] Task: Final automated test run across the entire frontend suite to ensure no regressions in existing toast behavior.
- [ ] Task: Conductor - User Manual Verification 'Testing and Refinement' (Protocol in workflow.md)
