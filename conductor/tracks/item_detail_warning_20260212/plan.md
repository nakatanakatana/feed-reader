# Implementation Plan: Resolve SolidJS Warning in ItemDetailModal

Address the `computations created outside a createRoot` warning during keyboard navigation in `ItemDetailModal`.

## Phase 1: Reproduction and Investigation
- [x] Task: Reproduce the warning in the development environment f061cff
    - [x] Run `make dev` and confirm the warning appears in the browser console when using 'j'/'k' in `ItemDetailModal`.
- [x] Task: Identify the specific code triggering the warning f061cff
    - [x] Use browser devtools (Solid Debugger if available, or stack traces) to pinpoint where the undisposed computation is created.
    - [x] Focus on `ItemDetailModal.tsx` keyboard handlers and `MarkdownRenderer.tsx`.
- [x] Task: Conductor - User Manual Verification 'Phase 1: Reproduction and Investigation' (Protocol in workflow.md) f061cff

## Phase 2: Fix Implementation
- [x] Task: Create a failing test case (if possible) f061cff
    - [x] Attempt to write a Vitest test in `frontend/src/components/ItemDetailModal.test.tsx` that triggers a console warning or detects leaked computations.
- [x] Task: Wrap offending code in appropriate reactive context f061cff
    - [x] Ensure event-driven reactive creations are wrapped in `batch` or handled via stable signals/memos within the component lifecycle.
    - [x] If `createMemo` or similar are called inside event handlers or async callbacks, move them to the component body or use `onCleanup`.
- [x] Task: Verify the fix in development f061cff
    - [x] Confirm the warning is gone in the browser console.
- [x] Task: Conductor - User Manual Verification 'Phase 2: Fix Implementation' (Protocol in workflow.md) f061cff

## Phase 3: Final Verification and Cleanup
- [x] Task: Run all frontend tests 475b300
    - [x] Execute `npm test` in the `frontend` directory to ensure no regressions.
- [x] Task: Check for memory leaks 475b300
    - [x] Briefly monitor memory usage in browser devtools to ensure stability after multiple navigations. f061cff
- [x] Task: Conductor - User Manual Verification 'Phase 3: Final Verification and Cleanup' (Protocol in workflow.md) ccfa830
