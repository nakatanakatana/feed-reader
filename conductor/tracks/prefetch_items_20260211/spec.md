# Specification: Item Prefetching for Faster Navigation

## Overview
Currently, the `ItemDetailModal` fetches item data only when the modal opens or when the user navigates to a different item. This results in a perceptible delay for users who quickly browse through multiple items. To improve this experience, this track introduces a prefetching mechanism that proactively fetches the data for neighboring items in the list.

## Functional Requirements
- **Modal-Based Prefetching**: When an item is displayed in the `ItemDetailModal`, the system must prefetch the data for items located before and after the current item in the list.
- **Prefetch Scope**: Prefetch up to 3 items immediately preceding and 3 items immediately following the current item (total of 6 items).
- **Instant Execution**: Prefetching must start immediately upon item display/navigation within the modal.
- **Data Scope**: Prefetch only the item's textual content (Markdown/HTML). Images within the content are NOT to be preloaded.
- **Request Management**:
    - Prefetch requests should not be cancelled when navigating.
    - If multiple prefetch requests are triggered in quick succession, they should be queued or managed to avoid redundant network calls for the same item ID.
    - Leverage TanStack Query's caching mechanism to ensure prefetched data is immediately available when the user navigates to those items.

## Non-Functional Requirements
- **Performance**: The transition to a prefetched item should feel instantaneous to the user.
- **Resource Efficiency**: Avoid excessive memory usage by relying on existing TanStack Query cache limits.

## Acceptance Criteria
- [ ] When the `ItemDetailModal` opens, the data for the next 3 and previous 3 items (if they exist in the current filtered list) are fetched and stored in the cache.
- [ ] Navigating between items via keyboard or UI buttons results in near-instant content display if the item was already prefetched.
- [ ] No redundant network requests are made for items already present in the cache or already being fetched.
- [ ] Images are not downloaded as part of the prefetch process.

## Out of Scope
- Prefetching from the main `ItemList` (e.g., on hover).
- Preloading images or other external assets.
- Changing the background scheduler's fetching logic.
