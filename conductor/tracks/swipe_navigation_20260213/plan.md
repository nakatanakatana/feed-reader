# Implementation Plan: Swipe Navigation for ItemDetailModal

## Phase 1: Touch Interaction Hook & Logic
Implement the core logic for detecting swipe gestures and calculating horizontal displacement.

- [ ] Task: Create `useSwipe` hook (or similar utility) to handle touch events.
    - [ ] Write unit tests for `useSwipe` to verify displacement calculation and threshold detection.
    - [ ] Implement `touchstart`, `touchmove`, and `touchend` event handlers.
    - [ ] Ensure vertical scrolling is not hindered by horizontal swipe detection.
- [ ] Task: Integrate swipe displacement into `ItemDetailModal` state.
    - [ ] Add reactive state for `translateX` in `ItemDetailModal`.
    - [ ] Apply `transform: translateX()` to the article content container.
- [ ] Task: Conductor - User Manual Verification 'Phase 1: Touch Interaction Hook & Logic' (Protocol in workflow.md)

## Phase 2: Navigation Integration
Connect the swipe gesture results to the existing item navigation logic.

- [ ] Task: Implement navigation trigger on `touchend`.
    - [ ] Write tests to verify that `onNext` and `onPrevious` are called when threshold is exceeded.
    - [ ] Implement logic to trigger existing `goToNext` / `goToPrevious` functions from `ItemDetailModal`.
    - [ ] Add smooth transition animation when switching items or snapping back.
- [ ] Task: Handle boundary cases (first/last items).
    - [ ] Ensure swiping doesn't cause errors or weird visual states at the list boundaries.
- [ ] Task: Conductor - User Manual Verification 'Phase 2: Navigation Integration' (Protocol in workflow.md)

## Phase 3: Refinement & Mobile UX
Polish the animation and ensure a high-quality feel on actual mobile devices.

- [ ] Task: Performance optimization.
    - [ ] Verify use of `will-change: transform` or other CSS optimizations for smooth 60fps movement.
- [ ] Task: Final UI/UX review on mobile.
    - [ ] Ensure swipe sensitivity feels "right" (tuning the 25% threshold if necessary).
- [ ] Task: Conductor - User Manual Verification 'Phase 3: Refinement & Mobile UX' (Protocol in workflow.md)
