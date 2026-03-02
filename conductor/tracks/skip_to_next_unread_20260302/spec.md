# Specification: Skip to Next Item (Keep Unread)

## 1. Overview
This track adds navigation to skip to the next item in the feed while keeping the current item unread. This feature is intended to allow users to quickly scan and postpone reading certain articles without marking them as read.

## 2. Functional Requirements
- **Keyboard Shortcut:** The 'n' key (next) will trigger navigation to the next item while preserving the unread state of the current item.
- **Mobile/Narrow Swipe:** On narrow-width devices (e.g., mobile), a swipe-up gesture starting from the bottom will trigger navigation to the next item while keeping the current one unread.
- **Swipe Threshold:** Low sensitivity (20-30% of screen height) for a quick and responsive feel.
- **Navigation Logic:** The skip action will proceed to the next item in the current item list, identical to the standard 'next' navigation, except it bypasses the 'mark as read' trigger.
- **Visual Feedback:** A brief slide-up animation will provide visual confirmation that the item has been skipped and remains unread.

## 3. Non-Functional Requirements
- **Responsiveness:** The swipe-up gesture must be optimized for low-latency feedback.
- **Accessibility:** Ensure the shortcut key is clearly documented in any keyboard shortcut help menus (if existing).

## 4. Acceptance Criteria
- [ ] Pressing the 'n' key on a desktop device moves the focus to the next item and does NOT mark the current item as read.
- [ ] Swiping up from the bottom (20-30% height) on a narrow device moves the focus to the next item and does NOT mark the current item as read.
- [ ] A slide-up animation is visible when the skip action is triggered.
- [ ] The feature is active by default for all users.

## 5. Out of Scope
- Configurable keyboard shortcuts or swipe directions.
- Bulk skipping of multiple items at once.
- Setting-based customization (defaults to always enabled).
