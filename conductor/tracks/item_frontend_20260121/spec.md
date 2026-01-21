# Specification: Item Fetching and Display Frontend

## Overview
Implement the frontend functionality to fetch and display items (articles) from RSS/Atom feeds. This includes an "All Items" view and a "Feed-Specific Items" view, allowing users to browse their subscriptions and interact with individual items.

## Functional Requirements

### 1. Item List Views
- **All Items Page:** Display a list of all items from all subscribed feeds.
- **Feed Items Page:** Display a list of items filtered by a specific feed (accessible via feed navigation).
- **Layout:** Use a clean **List View** that emphasizes item titles and displays essential metadata (e.g., published date, source feed name).

### 2. Data Fetching & Navigation
- **Fetch Logic:** Use `TanStack Query` and the `ItemService.ListItems` RPC to fetch item data.
- **Pagination:** Implement a "Load More" button at the bottom of the list to fetch and append the next batch of items using `limit` and `offset`.
- **Filtering:** 
    - The "All Items" view should call `ListItems` with no `feed_id`.
    - The "Feed Items" view should call `ListItems` with the specific `feed_id`.

### 3. Item Actions
- **Mark as Read/Unread:** Users can toggle the read status of an item. This should trigger the `ItemService.UpdateItemStatus` RPC and update the UI state.
- **Open URL:** Clicking on an item title or a specific "Open" action should open the original article URL in a new browser tab.

## Non-Functional Requirements
- **Responsive Design:** The list view must be readable and usable on both desktop and mobile devices.
- **Performance:** Efficiently handle list updates and pagination to ensure a smooth user experience.
- **Type Safety:** Ensure all data fetching and state management use TypeScript types generated from the Protobuf definitions.

## Acceptance Criteria
- [ ] Users can view a list of all items.
- [ ] Users can view items belonging to a specific feed.
- [ ] The "Load More" button successfully fetches more items and appends them to the list.
- [ ] Toggling the "Read" status updates the backend and reflects immediately in the UI.
- [ ] Clicking an item opens the correct external URL.
- [ ] The implementation follows the project's tech stack (SolidJS, Panda CSS, TanStack Query, Connect RPC).

## Out of Scope
- Detailed item reading view (item content rendering).
- Saved items (bookmarks) page.
- Bulk actions on items.
- Search functionality.
