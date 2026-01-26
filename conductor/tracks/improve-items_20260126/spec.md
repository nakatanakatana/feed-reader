# Specification: Improve Item List and Detail View

## Overview
This track focuses on enhancing the user experience of the item list and detailed viewing experience. Key improvements include a more readable reading interface, seamless read status management during navigation, deep linking for articles, and bulk operations for efficiency.

## Functional Requirements

### 1. Enhanced Item Detail Modal
- **Responsive Sizing:**
    - Desktop: A large modal covering approximately 80-90% of the viewport width/height.
    - Mobile: Fullscreen display.
- **Improved Readability:** Ensure the typography and layout within the modal are optimized for long-form reading.

### 2. Intelligent Auto-Mark as Read
- **Behavior:** When a user is navigating through articles within the detail modal (e.g., using "Next" buttons or keyboard shortcuts), the article they are *leaving* should be automatically marked as read.
- **Trigger:** Navigation event to the next/previous item.

### 3. Article Deep Linking (URL Sync)
- **Path Structure:** Update the URL to include the article ID when the modal is open (e.g., `/feeds/:feedId/items/:itemId` or `/items/:itemId`).
- **Navigation:** Support browser "Back" and "Forward" buttons to open/close or switch between items in the modal.

### 4. Bulk Mark as Read
- **Selection UI:** Add checkboxes to each item in the list view.
- **Bulk Action:** Provide a "Select All" mechanism and a "Mark as Read" action for the selected items.

## Non-Functional Requirements
- **Smooth Transitions:** Modal opening and URL updates should feel instantaneous and smooth.
- **Type Safety:** Ensure new routes and bulk action logic are fully type-safe using TanStack Router and TypeScript.

## Acceptance Criteria
- [ ] Item detail modal is significantly larger on desktop and fullscreen on mobile.
- [ ] Navigating between articles in the modal automatically marks the previously viewed article as "Read" on the server.
- [ ] Opening an article updates the browser URL path. Closing the modal returns the URL to the list view.
- [ ] Reloading the page with an article URL directly opens the corresponding article modal.
- [ ] Users can select multiple items in the list and mark them all as read with a single action.

## Out of Scope
- Automatic "Mark as Read" on scroll.
- Full-page article view (focus remains on the modal-based experience).
