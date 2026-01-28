# Track Specification: Standardize Item Ordering and Display

## Overview
Clarify and standardize the item ordering and display logic. Items should be sorted by publication date, falling back to creation date if publication date is missing. The UI should reflect this logic and distinguish between the two types of dates to provide a clearer timeline for the user.

## Functional Requirements
- **Backend (SQL):**
    - Update the item listing queries to sort items in ascending order (oldest first).
    - Use `COALESCE(published_at, created_at)` as the sorting key to ensure items without a publication date are still ordered meaningfully.
- **Frontend (UI):**
    - Display the date used for sorting in the item list and detail views.
    - Distinguish between the two date types using labels:
        - If `published_at` is available: "Published: [Date]" (公開日: [日付])
        - If `published_at` is missing (falling back to `created_at`): "Received: [Date]" (受信日: [日付])
    - Ensure the date format remains consistent across the application.

## Non-Functional Requirements
- **Performance:** Utilize SQL-level sorting (`COALESCE`) to maintain efficient database operations.
- **Maintainability:** Ensure the logic for selecting the display date is centralized or consistent between the list and detail components.

## Acceptance Criteria
- [ ] Items in the list are sorted by `published_at` (or `created_at` as fallback) in ascending order.
- [ ] UI correctly displays "Published: [Date]" when `published_at` exists.
- [ ] UI correctly displays "Received: [Date]" when `published_at` is NULL.
- [ ] Unit tests verify the sorting logic in the repository/store layer.
- [ ] Frontend tests verify that the correct label is displayed based on the availability of `published_at`.

## Out of Scope
- Changing the existing date storage format in the database.
- Adding user-configurable sorting options (e.g., toggling between ASC and DESC).
