# Implementation Plan: Responsive Header for Feed List

This plan outlines the steps to fix the layout breakage of the Feed List header on narrow screens by implementing a responsive, stacked layout and introducing floating action buttons for mobile.

## Phase 1: Research and Test Setup [checkpoint: 90ba51c]
Verify existing components and set up regression tests for mobile viewports.

- [x] Task: Research existing header implementation in `frontend/src/components/FeedList.tsx` and related styles. be861ac616e2d0c6193702b41eedbf9d1283f8c1
- [x] Task: Create a regression test file `frontend/src/components/FeedList.Responsive.test.tsx` that simulates narrow viewports (e.g., 375px) and asserts on layout breakage (overflow or hidden elements). a16bf5c
- [x] Task: Conductor - User Manual Verification 'Phase 1: Research and Test Setup' (Protocol in workflow.md) 90ba51c

## Phase 2: Implement Responsive Header Layout [checkpoint: 52833cb]
Refactor the header to support stacked layout using Panda CSS.

- [x] Task: [Red] Update `FeedList.Responsive.test.tsx` to assert that "Total Unread" is at the top and filters are stacked on mobile. 6d31ff8
- [x] Task: [Green] Modify `frontend/src/components/FeedList.tsx` to use responsive grid/flex layouts for the header. 6d31ff8
- [x] Task: [Red] Update `FeedList.Responsive.test.tsx` to assert that action buttons are hidden from the header on mobile. 6d31ff8
- [x] Task: [Green] Update `frontend/src/components/FeedList.tsx` to hide action buttons in the header for narrow viewports. 6d31ff8
- [x] Task: Conductor - User Manual Verification 'Phase 2: Implement Responsive Header Layout' (Protocol in workflow.md) 52833cb

## Phase 3: Implement Floating Action Buttons (FAB) [checkpoint: 822b9fe]
Add FAB for primary actions on mobile.

- [x] Task: [Red] Update `FeedList.Responsive.test.tsx` to assert that a floating action button is visible on mobile and performs the "Mark all as read" action. a87c812
- [x] Task: [Green] Create or update a component to provide a FAB for mobile users in `frontend/src/components/FeedList.tsx`. a87c812
- [x] Task: Verify that FAB does not appear on desktop resolutions. a87c812
- [x] Task: Conductor - User Manual Verification 'Phase 3: Implement Floating Action Buttons' (Protocol in workflow.md) 822b9fe

## Phase 4: Final Polishing and Verification [checkpoint: f3f82bf]
Ensure consistency and handle edge cases.

- [x] Task: Verify touch target sizes for all header controls on mobile. c95d301
- [x] Task: Run full frontend test suite `npm test` and linting `npm run lint`. c95d301
- [x] Task: Conductor - User Manual Verification 'Phase 4: Final Polishing and Verification' (Protocol in workflow.md) f3f82bf
