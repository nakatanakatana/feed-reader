# Implementation Plan: TanStack DB State Management Improvement

This plan outlines the refactoring of frontend state management to support incremental fetching, separate read/unread collections, and optimistic updates using TanStack DB.

## Phase 1: Core Database Schema Refactoring [checkpoint: 964c691]
Refactor the database schema to support separate collections and the necessary indices for incremental fetching.

- [x] Task: Refactor `src/lib/db.ts` to define `unreadItems` and `readItems` collections. 5dc83fc
- [x] Task: Add indices for `createdAt`, `updatedAt`, and `id` to both collections for efficient querying and merging. 5dc83fc
- [x] Task: Implement a synchronization mechanism (handlers) in `db.ts` to trigger API calls when items move between collections. 5dc83fc
- [ ] Task: Conductor - User Manual Verification 'Phase 1: Core Database Schema Refactoring' (Protocol in workflow.md)

## Phase 2: Logic Layer - Query and Mutation Updates
Update the query logic to handle the new collection structure and implement incremental fetching.

- [ ] Task: Write Tests: Create unit tests in `src/lib/item-query.test.ts` for `fetchNewItems` (future direction) and `fetchOlderItems` (past direction) logic.
- [ ] Task: Implement: Update `src/lib/item-query.ts` to implement `fetchNewItems` using a `lastFetchedAt` timestamp.
- [ ] Task: Implement: Update `src/lib/item-query.ts` to implement `fetchOlderItems` for "Load More" functionality at the top of the list.
- [ ] Task: Write Tests: Create unit tests for merging `unreadItems` and `readItems` collections via `LiveQuery`.
- [ ] Task: Implement: Create a utility or query to provide a merged view of both collections, sorted by `createdAt` ascending.
- [ ] Task: Conductor - User Manual Verification 'Phase 2: Logic Layer - Query and Mutation Updates' (Protocol in workflow.md)

## Phase 3: Frontend Component Integration
Update UI components to use the new incremental fetching logic and the "Load More" button.

- [ ] Task: Write Tests: Update `ItemList.test.tsx` to verify the "Load More" button at the top and the auto-appending of new items.
- [ ] Task: Implement: Modify `ItemList.tsx` to include the "Load More" button at the top of the list.
- [ ] Task: Implement: Update the item list view to use the merged `LiveQuery` and apply filters (date, tags) locally.
- [ ] Task: Implement: Ensure the list scrolls or maintains position correctly when items are prepended to the top.
- [ ] Task: Conductor - User Manual Verification 'Phase 3: Frontend Component Integration' (Protocol in workflow.md)

## Phase 4: Optimistic Updates and State Sync
Finalize the optimistic update logic and ensure backend synchronization is robust.

- [ ] Task: Write Tests: Create integration tests in `src/mocks/integration.test.tsx` for toggling read/unread status with optimistic updates and API failure handling.
- [ ] Task: Implement: Refine the optimistic update handlers to handle rollbacks if API calls fail.
- [ ] Task: Implement: Ensure `lastFetchedAt` is correctly updated and persisted (e.g., in local storage or a dedicated metadata collection).
- [ ] Task: Conductor - User Manual Verification 'Phase 4: Optimistic Updates and State Sync' (Protocol in workflow.md)
