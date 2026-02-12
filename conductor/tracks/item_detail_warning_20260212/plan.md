# Implementation Plan: Resolve SolidJS Warning in ItemDetailModal

Address the `computations created outside a createRoot` warning during keyboard navigation in `ItemDetailModal`.

## Phase 1: Reproduction and Investigation
- [ ] Task: Reproduce the warning in the development environment
    - [ ] Run `make dev` and confirm the warning appears in the browser console when using 'j'/'k' in `ItemDetailModal`.
- [ ] Task: Identify the specific code triggering the warning
    - [ ] Use browser devtools (Solid Debugger if available, or stack traces) to pinpoint where the undisposed computation is created.
    - [ ] Focus on `ItemDetailModal.tsx` keyboard handlers and `MarkdownRenderer.tsx`.
- [ ] Task: Conductor - User Manual Verification 'Phase 1: Reproduction and Investigation' (Protocol in workflow.md)

## Phase 2: Fix Implementation
- [ ] Task: Create a failing test case (if possible)
    - [ ] Attempt to write a Vitest test in `frontend/src/components/ItemDetailModal.test.tsx` that triggers a console warning or detects leaked computations.
- [ ] Task: Wrap offending code in appropriate reactive context
    - [ ] Ensure event-driven reactive creations are wrapped in `batch` or handled via stable signals/memos within the component lifecycle.
    - [ ] If `createMemo` or similar are called inside event handlers or async callbacks, move them to the component body or use `onCleanup`.
- [ ] Task: Verify the fix in development
    - [ ] Confirm the warning is gone in the browser console.
- [ ] Task: Conductor - User Manual Verification 'Phase 2: Fix Implementation' (Protocol in workflow.md)

## Phase 3: Final Verification and Cleanup
- [ ] Task: Run all frontend tests
    - [ ] Execute `npm test` in the `frontend` directory to ensure no regressions.
- [ ] Task: Check for memory leaks
    - [ ] Briefly monitor memory usage in browser devtools to ensure stability after multiple navigations.
- [ ] Task: Conductor - User Manual Verification 'Phase 3: Final Verification and Cleanup' (Protocol in workflow.md)
