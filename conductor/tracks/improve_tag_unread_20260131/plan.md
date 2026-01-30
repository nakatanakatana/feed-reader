# Implementation Plan: Improved Tag Unread Count Display

## Phase 1: Setup & Helpers [checkpoint: bf9a832]
- [x] Task: Create unread count formatting helper and unit tests. [37d655b]
    - [x] Define `formatUnreadCount` helper in `frontend/src/lib/item-utils.ts`.
    - [x] Add unit tests for `formatUnreadCount` in `frontend/src/lib/item-utils.test.ts`.
- [x] Task: Conductor - User Manual Verification 'Phase 1: Setup & Helpers' (Protocol in workflow.md)

## Phase 2: FeedList Component Refactoring [checkpoint: 4fffbcf]
- [x] Task: Implement consistent height and formatted counts for Tag and "All" buttons in `FeedList`. [eb455d7]
    - [x] Update `FeedList.tsx` to use `formatUnreadCount`.
    - [x] Update CSS in `FeedList.tsx` to ensure consistent button height (e.g., using `min-height` or fixed height).
    - [x] Adjust badge alignment and padding to ensure visual stability.
- [x] Task: Conductor - User Manual Verification 'Phase 2: FeedList Component Refactoring' (Protocol in workflow.md)

## Phase 3: ItemList Component Refactoring
- [ ] Task: Apply consistent height and formatted counts to `ItemList` tag filters.
    - [ ] Update `ItemList.tsx` to use `formatUnreadCount`.
    - [ ] Update CSS for consistency with `FeedList`.
- [ ] Task: Conductor - User Manual Verification 'Phase 3: ItemList Component Refactoring' (Protocol in workflow.md)

## Phase 4: Final Verification
- [ ] Task: Run all tests and verify mobile responsiveness.
    - [ ] Execute `npm test`.
    - [ ] Manually verify UI behavior on simulated mobile and desktop views.
- [ ] Task: Conductor - User Manual Verification 'Phase 4: Final Verification' (Protocol in workflow.md)
