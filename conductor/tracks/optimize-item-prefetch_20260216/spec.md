# Specification: Prefetch Optimization for Item Detail Navigation

## Overview
Optimize the item detail navigation to prevent redundant data fetching. Currently, items that have already been prefetched are being re-fetched from the network when the user navigates to them using "Next/Previous" buttons.

## Problem Analysis
1.  **Root Cause:** The `useQuery` in `ItemDetailModal` uses the default `staleTime` (0). Even though data is prefetched with a 5-minute `staleTime` in `prefetchItems`, the data is immediately considered "stale" when the modal mounts for a new item, triggering a background refetch.
2.  **Inefficient Behavior:** The discrepancy between prefetch settings and consumption settings leads to unnecessary network requests, wasting bandwidth and potentially slowing down the UI slightly.

## Functional Requirements
-   When viewing item details, if the item data is already in the cache and within its `staleTime`, the application must use the cached data without triggering a new network request.
-   Synchronize the `staleTime` configuration between the prefetching logic and the consumption logic (the Modal).

## Non-Functional Requirements
-   **Performance:** Reduce redundant API calls to improve navigation efficiency.
-   **Maintainability:** Extract prefetch-related constants (like `staleTime`) to ensure consistency across the codebase.

## Acceptance Criteria
-   [ ] Navigate from the item list to a detail view, then move to the next item. If the next item was already prefetched, no new API request should appear in the browser's Network tab.
-   [ ] If the cached data exceeds the defined `staleTime` (e.g., 5 minutes), a re-fetch should occur as expected.
-   [ ] All existing tests pass.

## Out of Scope
-   Improving the raw response speed of the API.
-   Prefetching image assets (this optimization focuses on JSON data).
