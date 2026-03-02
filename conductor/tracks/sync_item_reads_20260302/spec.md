# Track Specification: sync_item_reads_20260302

## Overview
Synchronize the "read/unread" status of items across multiple browsers or devices. When an item is marked as read or unread on one device, the change should be automatically reflected on other devices within a certain interval, providing a consistent reading experience.

## Functional Requirements

### 1. Read Status Retrieval API (Backend)
- Add a new RPC `ListItemReads` to `ItemService`.
- **Request:**
    - `since` (google.protobuf.Timestamp): Filter for read status changes updated after this timestamp.
    - `limit` (int32): Maximum number of records to return.
    - `offset` (int32): Number of records to skip.
- **Response:**
    - A list of item read statuses, each containing `item_id`, `is_read`, and `updated_at`.
- **Implementation Details:**
    - Utilize the `updated_at` column in the `item_reads` table to efficiently fetch incremental updates.
    - Support syncing both "read" and "unread" states by tracking changes to the `is_read` flag.

### 2. Periodic Polling for Read Status (Frontend)
- Implement a background polling mechanism that calls `ListItemReads` every 1 minute (default).
- Manage the "base timestamp" for synchronization:
    - Initial: The `created_at` timestamp from the first `ListItems` call (or the server time at that moment).
    - Subsequent: The latest `updated_at` from the previous successful `ListItemReads` response.
- Update the local state in **TanStack DB** with the fetched delta information.
- Reflect changes in the UI (graying out items, adding "Read" tags) silently without intrusive notifications or animations.

### 3. Integration with Manual Refresh
- When the "Refetch" button in the item list is clicked, trigger a `ListItemReads` call along with the standard item list refresh to immediately synchronize the read status.

## Non-Functional Requirements
- **Performance:** Ensure efficient delta fetching using database indexes on `item_reads.updated_at`.
- **Reliability:** Handle polling errors gracefully by retrying in the next interval to maintain eventual consistency.

## Acceptance Criteria
- [ ] Within 1 minute of marking an item as read on Device A, Device B should automatically reflect the item as read (grayed out).
- [ ] Marking an item as unread on Device A should revert the item to unread status on Device B within the polling interval.
- [ ] Clicking the "Refetch" button should immediately synchronize any pending read status changes from other devices.
- [ ] Large volumes of read status history should be handled efficiently by fetching only the differences since the last sync.

## Out of Scope
- Real-time synchronization using WebSockets or Server-Sent Events (SSE). Polling is the chosen approach for this phase.
- Synchronization of other states (e.g., adding/deleting feeds or tags).
