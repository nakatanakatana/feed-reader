# Improvement of TanStack DB State Management and Incremental Fetching

## Overview
Refactor the frontend state management using `TanStack DB` by adopting the "Handling Partial/Incremental Fetches" pattern. This will enable efficient incremental data loading, separate collections for read/unread states, and a smooth user experience through optimistic updates.

## Functional Requirements

### 1. Incremental Data Fetching and Management
- **Future Direction (New Items):**
  - Maintain a `lastFetchedAt` timestamp.
  - When checking for updates, fetch only items created after this timestamp.
  - Automatically append new items to the **bottom** of the list.
  - The display order will be **Oldest First (Ascending)** (older items at the top, newer items at the bottom).

- **Past Direction (Paging):**
  - Place a "Load More" button at the **top** of the list.
  - When clicked, fetch items older than the current oldest item in the collection.
  - Prepend these items to the **top** of the list.

### 2. Collection Separation and Integration
- **Collection Structure:**
  - Maintain two separate collections: `unreadItems` and `readItems`.
  - When displaying "All items," merge these two collections using a `LiveQuery` or a combined view.

- **State Synchronization:**
  - Marking an item as read/unread involves removing it from one collection and adding it to the other.
  - **Handler Integration:** Trigger backend API synchronization calls within the collection's update handlers (e.g., `onUpdate`) or the action handlers to ensure the database stays in sync.

### 3. UI/UX Requirements
- **Filtering:**
  - Filters (e.g., date, tags) should be processed via frontend `LiveQuery` against the local collections rather than making new API requests.
  - Toggle between read/unread views using a filter menu or toggle switch on the current list view.

- **User Experience:**
  - **Optimistic UI Updates:** Reflect state changes (e.g., toggling read status) immediately in the UI and collections without waiting for the API response.
  - Ensure immediate visual feedback when items are added to the list.

## Non-Functional Requirements
- Ensure performance remains stable as data grows by utilizing TanStack DB indexing.
- Refactor existing logic in `src/lib/db.ts` and related query files to integrate these changes.

## Out of Scope
- Modifications to the backend API schema.
- Major redesign of the UI components (reuse existing styles and components).
