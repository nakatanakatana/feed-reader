# Implementation Plan - Prefetch Optimization

## Phase 1: Verification and Testing Foundation
- [x] Task: Create reproduction test for redundant fetch (38065fe)
    - [x] Analyze existing tests in `frontend/src/lib/item-prefetch.test.ts`.
    - [x] Write a test case that demonstrates `useQuery` triggering a network fetch even if the data exists in the cache (simulating the default `staleTime: 0` behavior).
- [x] Task: Conductor - User Manual Verification 'Phase 1: Verification and Testing Foundation' (Protocol in workflow.md)

## Phase 2: Implementation of Optimization
- [ ] Task: Unify prefetch configuration
    - [ ] Define a shared constant `ITEM_STALE_TIME` in `frontend/src/lib/item-prefetch.ts`.
    - [ ] Update `prefetchItems` in `frontend/src/lib/item-prefetch.ts` to use this constant.
    - [ ] Update `ItemDetailModal` in `frontend/src/components/ItemDetailModal.tsx` to use the same `ITEM_STALE_TIME` for its `useQuery`'s `staleTime`.
- [ ] Task: Update and verify tests
    - [ ] Update the test case from Phase 1 to verify that the redundant fetch is suppressed when `staleTime` is correctly configured.
    - [ ] Run all frontend tests to ensure no regressions in item loading or prefetching logic.
- [ ] Task: Conductor - User Manual Verification 'Phase 2: Implementation of Optimization' (Protocol in workflow.md)
