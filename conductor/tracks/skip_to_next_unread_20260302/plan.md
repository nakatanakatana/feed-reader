# Implementation Plan: Skip to Next Item (Keep Unread)

## Phase 1: Foundation and Keyboard Shortcut
- [ ] Task: Research existing item navigation and "mark as read" logic in `frontend/src/`.
- [ ] Task: Write failing tests for 'n' key shortcut in `frontend/src/components/` or `frontend/src/routes/`.
- [ ] Task: Implement 'n' key listener to trigger "skip to next" navigation.
- [ ] Task: Implement navigation logic that moves focus to the next item *without* triggering the `markAsRead` action.
- [ ] Task: Add basic slide-up animation CSS/logic for the skip transition.
- [ ] Task: Conductor - User Manual Verification 'Phase 1: Foundation and Keyboard Shortcut' (Protocol in workflow.md)

## Phase 2: Mobile Swipe Gesture
- [ ] Task: Write failing tests for swipe-up gesture detection on narrow-width containers.
- [ ] Task: Implement swipe-up gesture detection with 20-30% height threshold using touch events.
- [ ] Task: Connect the swipe-up gesture to the skip navigation logic established in Phase 1.
- [ ] Task: Refine the slide-up animation to feel responsive to the swipe gesture.
- [ ] Task: Verify responsive behavior and touch target consistency.
- [ ] Task: Conductor - User Manual Verification 'Phase 2: Mobile Swipe Gesture' (Protocol in workflow.md)

## Phase 3: Final Polish and Documentation
- [ ] Task: Ensure the shortcut is mentioned in any keyboard help UI.
- [ ] Task: Verify code coverage for new navigation logic (Target >80%).
- [ ] Task: Run full suite of frontend tests to ensure no regressions in standard navigation.
- [ ] Task: Conductor - User Manual Verification 'Phase 3: Final Polish and Documentation' (Protocol in workflow.md)
