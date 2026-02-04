# Specification: Sort Items by Created Date

## Overview
This track changes the primary sorting criterion for items from `published_at` to `created_at` across both the API and the UI. Additionally, it updates the Item Detail Modal to display both the publication date (`published_at`) and the ingestion date (`created_at`).

## Functional Requirements
- **Backend (API):**
    - Modify the item retrieval logic to sort items by `created_at` in ascending order (ASC) by default.
    - Ensure the Connect RPC API correctly handles this sorting order.
- **Frontend (UI):**
    - **Item List:** Ensure the list view reflects the new `created_at` ASC sorting order.
    - **Item Detail Modal:**
        - Display both `published_at` (Publication Date) and `created_at` (Ingestion Date).
        - The two dates should be displayed side-by-side (parallel).
- **Existing Data:**
    - All existing items in the database will be sorted using the new `created_at` ASC rule. No special migration or legacy handling is required.

## Non-Functional Requirements
- **Performance:** Sorting by `created_at` should be efficient. Ensure appropriate database indexes are in place.
- **UI Consistency:** The date display in the modal should follow the project's visual guidelines for information density and clarity.

## Acceptance Criteria
- [ ] Items in the main list are sorted by `created_at` in ascending order (oldest first).
- [ ] Opening an item detail modal shows both "Published" and "Created" dates.
- [ ] Both dates in the modal are clearly labeled and formatted consistently.
- [ ] Unit and integration tests verify the sorting logic and UI display.

## Out of Scope
- Adding user-configurable sorting options (e.g., a dropdown to switch between `created_at` and `published_at`).
- Changes to other sorting criteria like title or feed source.
