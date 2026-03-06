# Implementation Plan: Sync Item Read State via Delta Fetching

## Phase 1: Foundation & TanStack DB Setup
- [x] Task: Define `ItemRead` collection in `tanstack/db` schema 827bebf
    - [x] Reference the `items` collection structure in `frontend/src/lib/item-db.ts`.
    - [x] Implement incremental fetching (differential acquisition) by merging new server data with existing local data in `queryFn` using `Map`.
    - [x] Include `id` (Item ID), `isRead`, and `updatedAt` (to track sync/local changes) fields.
    - [x] Implement **Optimistic Updates** in `onUpdate`:
        - [x] Use `transaction.mutations` to update local state immediately.
        - [x] Batch multiple changes into a single API request where possible.
    - [x] Manage internal state (e.g., `lastFetched` signal/anchor) for tracking sync progress.
- [x] Task: Implement `ItemRead` repository/service for basic CRUD operations b336904
    - [x] Write tests for adding, updating, and retrieving read states from `tanstack/db`.
    - [x] Implement the repository methods using `tanstack/db` transactions for bulk operations.
- [x] Task: Conductor - User Manual Verification 'Phase 1: Foundation & TanStack DB Setup' (Protocol in workflow.md) a622962

## Phase 2: Delta Sync Logic & API Integration
- [x] Task: Implement `LastFetchState` to manage the sync anchor b336904
    - [x] Reference `items` collection pattern for using an internal state/signal.
    - [x] **Initial Sync Baseline**: Initialize the anchor to the timestamp when items were last fetched (leveraging the fact that initial items already have read status).
- [x] Task: Implement the Delta Sync Service ba4495d
    - [x] Write tests for the sync logic:
        - [x] Fetching with `since` parameter using the anchor.
        - [x] Merging results into `ItemRead` collection.
        - [x] Updating the anchor on success.
        - [x] **Error Handling**: Do not update the anchor if the API call fails; retry in the next cycle.
    - [x] Implement the sync service using the `ListItemRead` API.
- [x] Task: Background Sync & Timer Management ba4495d
    - [x] Write tests for the background polling mechanism. (Handled by TanStack Query refetchInterval)
    - [x] Implement a global timer for periodic sync. (Handled by TanStack Query refetchInterval)
    - [x] **Timer Reset Logic**: Ensure that manual sync (triggered by Refresh) resets the interval to prevent overlapping executions. (Handled by TanStack Query)
- [x] Task: Conductor - User Manual Verification 'Phase 2: Delta Sync Logic & API Integration' (Protocol in workflow.md) ba4495d

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
