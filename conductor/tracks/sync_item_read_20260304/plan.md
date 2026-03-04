# Implementation Plan: Sync Item Read State via Delta Fetching

## Phase 1: Foundation & TanStack DB Setup
- [ ] Task: Define `ItemRead` collection in `tanstack/db` schema
    - [ ] Reference the `items` collection structure in `frontend/src/lib/item-db.ts`.
    - [ ] Implement incremental fetching (differential acquisition) by merging new server data with existing local data in `queryFn` using `Map`.
    - [ ] Include `id` (Item ID), `isRead`, and `updatedAt` (to track sync/local changes) fields.
    - [ ] Implement **Optimistic Updates** in `onUpdate`:
        - Use `transaction.mutations` to update local state immediately.
        - Batch multiple changes into a single API request where possible.
    - [ ] Manage internal state (e.g., `lastFetched` signal/anchor) for tracking sync progress.
- [ ] Task: Implement `ItemRead` repository/service for basic CRUD operations
    - [ ] Write tests for adding, updating, and retrieving read states from `tanstack/db`.
    - [ ] Implement the repository methods using `tanstack/db` transactions for bulk operations.
- [ ] Task: Conductor - User Manual Verification 'Phase 1: Foundation & TanStack DB Setup' (Protocol in workflow.md)

## Phase 2: Delta Sync Logic & API Integration
- [ ] Task: Implement `LastFetchState` to manage the sync anchor
    - [ ] Reference `items` collection pattern for using an internal state/signal.
    - [ ] **Initial Sync Baseline**: Initialize the anchor to the timestamp when items were last fetched (leveraging the fact that initial items already have read status).
- [ ] Task: Implement the Delta Sync Service
    - [ ] Write tests for the sync logic:
        - Fetching with `since` parameter using the anchor.
        - Merging results into `ItemRead` collection.
        - Updating the anchor on success.
        - **Error Handling**: Do not update the anchor if the API call fails; retry in the next cycle.
    - [ ] Implement the sync service using the `ListItemRead` API.
- [ ] Task: Background Sync & Timer Management
    - [ ] Write tests for the background polling mechanism.
    - [ ] Implement a global timer for periodic sync.
    - [ ] **Timer Reset Logic**: Ensure that manual sync (triggered by Refresh) resets the interval to prevent overlapping executions.
- [ ] Task: Conductor - User Manual Verification 'Phase 2: Delta Sync Logic & API Integration' (Protocol in workflow.md)

## Phase 3: UI Integration & Refresh Mechanism
- [ ] Task: Implement Join Logic in `ItemList`
    - [ ] Write tests for fetching items joined with their read status from the `ItemRead` collection.
    - [ ] Update the `ItemList` data fetching logic to use the join.
- [ ] Task: Visual Representation in `ItemList`
    - [ ] Write tests/component tests for visual states (dimming, read badge).
    - [ ] Update the `Item` component to reflect the `isRead` status from the joined `ItemRead` data.
- [ ] Task: Manual Refresh Integration
    - [ ] Hook into the `Refresh` button in the `ListItem` page.
    - [ ] **Action**: Trigger `ItemRead` delta sync immediately upon Refresh and reset the background sync timer.
- [ ] Task: Conductor - User Manual Verification 'Phase 3: UI Integration & Join Logic' (Protocol in workflow.md)

## Phase 4: Final Polishing & Edge Cases
- [ ] Task: Conflict Resolution ("Server Wins")
    - [ ] Verify that server-provided read states correctly overwrite local states during sync.
- [ ] Task: Transactional Bulk Updates
    - [ ] Ensure "Mark all as read" operations use `tanstack/db` transactions to batch local updates and sync requests.
- [ ] Task: Conductor - User Manual Verification 'Phase 4: Final Polishing & Edge Cases' (Protocol in workflow.md)
