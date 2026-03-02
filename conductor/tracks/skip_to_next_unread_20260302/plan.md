# Implementation Plan: Skip to Next Item (Keep Unread)

## Phase 1: Foundation and Keyboard Shortcut
- [x] Task: Research existing item navigation and "mark as read" logic in `frontend/src/`. 736768e
- [x] Task: Write failing tests for 'n' key shortcut in `frontend/src/components/` or `frontend/src/routes/`. 643332c
- [x] Task: Implement 'n' key listener to trigger "skip to next" navigation. 643332c
- [x] Task: Implement navigation logic that moves focus to the next item *without* triggering the `markAsRead` action. 643332c
- [x] Task: Add basic slide-up animation CSS/logic for the skip transition. 643332c
- [ ] Task: Conductor - User Manual Verification 'Phase 1: Foundation and Keyboard Shortcut' (Protocol in workflow.md)

## Phase 2: Mobile Swipe Gesture
- [x] Task: Write failing tests for swipe-up gesture detection on narrow-width containers. 643332c
- [x] Task: Implement swipe-up gesture detection with 20-30% height threshold using touch events. 643332c
- [x] Task: Connect the swipe-up gesture to the skip navigation logic established in Phase 1. 643332c
- [x] Task: Refine the slide-up animation to feel responsive to the swipe gesture. 643332c
- [x] Task: Verify responsive behavior and touch target consistency. 643332c
- [ ] Task: Conductor - User Manual Verification 'Phase 2: Mobile Swipe Gesture' (Protocol in workflow.md)

## Phase 3: Final Polish and Documentation
- [ ] Task: Ensure the shortcut is mentioned in any keyboard help UI.
- [x] Task: Verify code coverage for new navigation logic (Target >80%). 643332c
- [x] Task: Run full suite of frontend tests to ensure no regressions in standard navigation. 643332c
- [ ] Task: Conductor - User Manual Verification 'Phase 3: Final Polish and Documentation' (Protocol in workflow.md)
