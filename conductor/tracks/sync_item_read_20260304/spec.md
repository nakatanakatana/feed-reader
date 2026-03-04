# Specification: Sync Item Read State via Delta Fetching

## 1. Overview
Implement a mechanism to synchronize the "read" state of items between the client and server using a delta-fetching approach. This involves tracking the last fetch timestamp and retrieving only the changes (newly read/unread statuses) from the `ListItemRead` API. Client-side state will be managed using `tanstack/db` with a dedicated `ItemRead` collection, following the architectural pattern of the existing `items` collection.

## 2. Functional Requirements
### 2.1 Delta Synchronization
- **Initial Sync**: Initialize the synchronization anchor (`lastFetched`) to the timestamp when items were last fetched. This ensures that only new status changes after the initial data load are synchronized.
- **Delta Fetching**: call the `ListItemRead` API with the `since` parameter (the last successful fetch timestamp) to retrieve changes in read states.
- **Background Sync**: Implement a periodic background timer to keep the read state up to date.
- **Manual Refresh**: When the user clicks the "Refresh" button on the `ListItem` page:
    - Immediately trigger the `ItemRead` delta sync.
    - Reset the background sync timer to prevent overlapping executions.
- **Error Handling**: If an API call fails, the synchronization anchor MUST NOT be updated. The sync will be retried in the next cycle.

### 2.2 Client-Side State Management (tanstack/db)
- **Collection Definition**:
    - Create an `ItemRead` collection in `tanstack/db` with fields: `id` (Item ID), `isRead`, and `updatedAt`.
    - **Data Merging**: Follow the `items` collection pattern in `frontend/src/lib/item-db.ts`. In `queryFn`, fetch new data and merge it with existing local data using a `Map` to ensure efficient differential updates.
- **Optimistic Updates**:
    - Use `tanstack/db`'s `onUpdate` to provide immediate UI feedback.
    - Utilize **Transactions** to batch multiple local state changes and corresponding API requests (e.g., when marking multiple items as read).
- **Join Logic**: When rendering the `ItemList`, perform a join between the `Item` collection and the `ItemRead` collection.

### 2.3 User Interface
- **Read Representation**:
    - **Visual Dimming**: Items marked as "read" should be visually dimmed or greyed out in the list.
    - **Read Indicator**: Display a "Read" badge or specific icon for items that have been read.
- **State Conflict**: In case of conflicts between local changes and server data, the server's state will take precedence ("Server Wins").

## 3. Non-Functional Requirements
- **Efficiency**: Minimize data transfer by only fetching delta updates. Use transactions to batch updates.
- **Consistency**: Ensure the `ItemRead` collection is kept in sync with the server.
- **UX**: Provide immediate feedback through optimistic updates and ensure the manual refresh feels responsive by resetting the background timer.

##  acceptance Criteria
- [ ] `ItemRead` collection follows the `items` collection implementation pattern (incremental fetching/merging).
- [ ] Initial sync anchor is correctly set based on the `items` fetch timestamp.
- [ ] Manual "Refresh" triggers sync and resets the periodic timer.
- [ ] Optimistic updates reflect read status changes immediately in the UI.
- [ ] Batch operations use `tanstack/db` transactions for efficiency.
- [ ] API failures do not result in lost delta updates (anchor persistence).

## 4. Out of Scope
- Full offline-first editing (focus is specifically on "read" state).
- Complex multi-device conflict resolution beyond "Server Wins".
