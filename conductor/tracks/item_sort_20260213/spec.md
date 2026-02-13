# Specification: Sort Items by Created At (Ascending)

## Overview
To unify the application's behavior, the display order of items will be fixed to ascending order by `created_at` (oldest first). This will be achieved by implementing a common `useSortedLiveQuery` hook in `item-db.ts` that handles sorting on the client-side, ensuring consistency across all parts of the application that display items.

## Functional Requirements
- **Centralized Client-Side Sorting:** Implement `useSortedLiveQuery` in `item-db.ts` to sort items by their `created_at` property in ascending order.
- **Data Source:** Continue using TanStack DB for data fetching; sorting must happen on the client-side within the reactive hook logic.
- **Unified Sort Order:** Ensure all item displays use this centralized logic to maintain a "Newest at Bottom / Oldest at Top" (ascending) sequence.
- **Scope of Application:**
  - Main item list (`ItemList`)
  - Search results and filtered lists (e.g., by tags or folders)
  - Unread items view (when the "Show Read" toggle is off)

## Non-Functional Requirements
- **Consistency:** The sort order must be identical across all views without exception.
- **Maintainability:** Sorting logic must be encapsulated in `item-db.ts` to allow for easy future adjustments.
- **Performance:** Ensure that client-side sorting remains efficient for typical feed sizes.

## Acceptance Criteria
- [x] `item-db.ts` contains a centralized `useSortedLiveQuery` hook that sorts items by `created_at` in ascending order.
- [x] All components displaying items (e.g., `ItemList`) use the centralized sorted hook from `item-db.ts`.
- [x] Items are correctly displayed from oldest to newest in the UI.
- [x] The sort order is preserved when applying filters, searching, or toggling unread items.
- [x] All existing tests pass, and new tests are added to verify the client-side sorting logic.

## Out of Scope
- Backend or API changes for data retrieval or server-side sorting.
- UI features for user-selectable sort orders.
- Database schema changes or index additions.
