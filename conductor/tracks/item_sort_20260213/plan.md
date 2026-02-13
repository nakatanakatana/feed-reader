# Implementation Plan - Sort Items by Created At (Ascending)

This plan outlines the steps to unify item sorting across the application by implementing a centralized `useSortedLiveQuery` hook in `item-db.ts`.

## Phase 1: Implement Sorted Collection Hook in `item-db.ts`
- [x] Task: Update `frontend/src/lib/item-db.ts` to implement `useSortedLiveQuery`. [70e4e2a]
- [x] Task: Update `itemsUnreadQuery` in `frontend/src/lib/item-db.ts`. [70e4e2a]
- [x] Task: Verify `item-db.ts` exports these new/updated collections. [70e4e2a]

## Phase 2: Update Components to Use Sorted Collections
- [x] Task: Update `frontend/src/components/ItemList.tsx`. [70e4e2a]
- [x] Task: Update `frontend/src/components/ItemDetailRouteView.tsx`. [70e4e2a]
- [x] Task: Search for any other usages of `items()` within `useLiveQuery` across the project and update them to use `useSortedLiveQuery`. [70e4e2a]

## Phase 3: Verification and Testing
- [x] Task: Update `frontend/src/lib/item-db.test.ts` to include tests for the sorting logic. [70e4e2a]
- [x] Task: Run all frontend tests using `npm test`. [70e4e2a]
- [x] Task: Conductor - User Manual Verification 'Sort Items by Created At' (Protocol in workflow.md) [70e4e2a]

## Phase 4: Finalize
- [x] Task: Checkpoint and commit all changes. [70e4e2a]
