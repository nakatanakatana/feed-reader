# Implementation Plan: address_pr167_review_20260214

# Phase 1: Test Infrastructure and Refactoring [checkpoint: 0024b4b]
1.  **[x] Task: Refactor Test Utilities** dbbfa02
    -   [x] Extract `dispatchTouch` and related touch simulation logic from `ItemDetailModal.Swipe.test.tsx` and `use-swipe.test.ts` into a shared utility file (e.g., `frontend/src/test-utils/touch.ts`).
    -   [x] Update `Touch` identifier to use a deterministic incremental counter.
2.  **[x] Task: Verify Existing Tests** dbbfa02
    -   [x] Run existing swipe-related tests to ensure refactoring didn't break anything.
    -   [x] Task: Conductor - User Manual Verification 'Phase 1: Test Infrastructure and Refactoring' (Protocol in workflow.md)

# Phase 2: Core Logic Enhancements (`use-swipe.ts`) [checkpoint: 53e9808]
1.  **[x] Task: Implement `touchcancel` and `preventDefault`** 1220516
    -   [x] **Write Tests:** Add a test case in `use-swipe.test.ts` for `touchcancel` and verify state reset.
    -   [x] **Implement:** Add `touchcancel` handler to `use-swipe.ts`.
    -   [x] **Implement:** Add `e.preventDefault()` in `touchmove` when horizontal swipe is confirmed.
2.  **[x] Task: Adjust Thresholds and Boundary Behavior** 1220516
    -   [x] **Write Tests:** Add tests for the 50px vertical cancellation threshold.
    -   [x] **Implement:** Update `verticalThreshold` in `use-swipe.ts`.
    -   [x] **Implement:** Add a mechanism to conditionally disable dragging (for list boundaries).
    -   [x] Task: Conductor - User Manual Verification 'Phase 2: Core Logic Enhancements' (Protocol in workflow.md)

# Phase 3: UI/UX and Accessibility (`ItemDetailModal.tsx`) [checkpoint: 16c658f]
1.  **[x] Task: Boundary Navigation and State Optimization** 16c658f
    -   [x] **Implement:** Apply the boundary check (`itemId !== "end-of-list"`) to `onSwipeLeft` / `onSwipeRight`.
    -   [x] **Implement:** Conditionally apply `will-change: transform` only when `x() !== 0`.
    -   [x] **Implement:** Adjust `transition` logic to avoid jarring jumps during item navigation.
2.  **[x] Task: Accessibility and Visual Affordance** 16c658f
    -   [x] **Implement:** Add ARIA labels/hidden text describing swipe navigation to the modal.
    -   [x] **Implement:** Add a subtle visual hint (e.g., edge bounce) on first mount or during swipe.
    -   [x] Task: Conductor - User Manual Verification 'Phase 3: UI/UX and Accessibility' (Protocol in workflow.md)

# Phase 4: Final Verification and Documentation
1.  **[x] Task: Full Regression Testing** 16c658f
    -   [x] Run all frontend tests (`npm test`).
2.  **[x] Task: Documentation Polish**
    -   [x] Ensure `spec.md` and `tracks.md` reflect the final implementation details (e.g., the 50px threshold).
    -   [x] Task: Conductor - User Manual Verification 'Phase 4: Final Verification and Documentation' (Protocol in workflow.md)
