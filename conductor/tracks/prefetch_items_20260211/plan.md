# Implementation Plan: Item Prefetching for Faster Navigation

This plan introduces a proactive prefetching mechanism for the `ItemDetailModal` to enhance navigation speed between articles.

## Phase 1: Infrastructure & Discovery [checkpoint: 809a906]
- [x] Task: Research existing data fetching logic in `ItemDetailModal` and `ItemDetailRouteView`.
- [x] Task: Identify how to access the current filtered list of item IDs within the modal context to determine "neighboring" items.
- [x] Task: Conductor - User Manual Verification 'Infrastructure & Discovery' (Protocol in workflow.md)

## Phase 2: Implementation of Prefetch Logic [checkpoint: 250886a]
- [x] Task: Create a custom hook or utility function to prefetch a list of items using TanStack Query's `prefetchQuery`. a661894
- [x] Task: Implement logic to calculate the window of 3 items before and after the current item based on the active item list. a661894
- [x] Task: Integrate the prefetch trigger into `ItemDetailRouteView` or `ItemDetailModal` so it fires on mount and when the item ID changes. 571677a
- [x] Task: Ensure that the prefetch logic handles the "end of list" and "start of list" cases gracefully. 571677a
- [x] Task: Conductor - User Manual Verification 'Implementation of Prefetch Logic' (Protocol in workflow.md)

## Phase 3: Verification & Optimization [checkpoint: 78b5f29]
- [x] Task: Write unit tests for the prefetch window calculation logic. a661894
- [x] Task: Write integration tests using Vitest to verify that `prefetchQuery` is called with the correct IDs when an item is displayed. 571677a
- [x] Task: Verify that navigating to a prefetched item results in a 'cache hit' and no new network request for the main item data. 571677a
- [x] Task: Conductor - User Manual Verification 'Verification & Optimization' (Protocol in workflow.md)
