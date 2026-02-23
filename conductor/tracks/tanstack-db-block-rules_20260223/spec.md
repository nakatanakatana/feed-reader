# Specification: TanStack DB Migration for Block Rules

## Overview
Currently, `URLParsingRule` and `ItemBlockRule` are managed using `TanStack Query` hooks directly within various components. To improve consistency and leverage centralized state management, this track will migrate these entities to `TanStack DB` collections within a new `frontend/src/lib/block-db.ts` file, following the pattern established in `feed-db.ts`.

## Functional Requirements
1.  **Centralized State Management:**
    *   Create a new file `frontend/src/lib/block-db.ts`.
    *   Define `URLParsingRule` and `ItemBlockRule` interfaces.
    *   Implement `urlParsingRules` and `itemBlockRules` collections using `createCollection` and `queryCollectionOptions` from `tanstack/db`.
2.  **API Integration:**
    *   The collections should use `ItemService` (via `itemClient`) for `list`, `add`, and `delete` operations.
    *   Implement helper functions for common operations:
        *   `urlParsingRuleInsert(domain, ruleType, pattern)`
        *   `urlParsingRuleDelete(id)`
        *   `itemBlockRuleInsert(rules[])`
        *   `itemBlockRuleDelete(id)`
3.  **UI Updates:**
    *   Update `frontend/src/routes/block-rules.tsx` to use the new `itemBlockRules` collection.
    *   Update `frontend/src/routes/url-rules.tsx` to use the new `urlParsingRules` collection.
    *   Update `frontend/src/components/ItemDetailModal.tsx` to use the new collections for blocking actions.
    *   Ensure all forms and delete buttons correctly call the new helper functions.
4.  **Consistency:**
    *   Maintain the same patterns (e.g., `queryKey`, `gcTime`, `onDelete` handling) as seen in `feed-db.ts`.

## Non-Functional Requirements
*   **Type Safety:** Ensure all new collections and functions are fully typed using generated Protobuf types.
*   **Performance:** Leverage `TanStack DB`'s reactivity to ensure UI updates are efficient.
*   **Maintainability:** Centralizing this logic will make it easier to manage and test in the future.

## Acceptance Criteria
*   [ ] `frontend/src/lib/block-db.ts` is created and exports `urlParsingRules` and `itemBlockRules` collections.
*   [ ] Block Management UI (`/block-rules`) functions correctly using the new collection.
*   [ ] URL Parsing Rules UI (`/url-rules`) functions correctly using the new collection.
*   [ ] Item Detail Modal correctly adds block rules using the new collection/helper.
*   [ ] Deleting a rule via the UI correctly triggers a backend deletion and updates the local state.
*   [ ] Bulk adding block rules works as expected.

## Out of Scope
*   Migration of other entities not mentioned (e.g., Items, Tags) unless necessary for this migration.
*   Backend changes.
