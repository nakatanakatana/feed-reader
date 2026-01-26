# Specification: Remove Unused Feed Routes and Modal Elements

## Overview
This track aims to clean up the codebase by removing unused features and UI elements. Specifically, the dedicated routes for viewing individual feeds (`feed/<feedId>`) and their associated item details will be removed. Additionally, the close button ("×") in the Item Detail Modal will be removed. The Feed List in the sidebar will be updated to focus solely on management actions.

## Functional Requirements

### 1. Route Removal
-   **Remove Feed View Route:** Delete the `feeds/$feedId` route.
-   **Remove Feed Item View Route:** Delete the `feeds/$feedId/items/$itemId` route.
-   **Cleanup:** Ensure these routes are removed from the router configuration (`routeTree`).

### 2. UI Updates
-   **Feed List (Sidebar):**
    -   Disable/Remove the functionality that navigates to the feed view when clicking a feed item.
    -   The Feed List should only support management actions (e.g., via the existing dropdown/menu) and not act as a filter/navigation link.
-   **Item Detail Modal:**
    -   Remove the "Close" (×) button located in the top-right corner of the modal.

## Impact Analysis
-   **Frontend Routes:** `frontend/src/routes/feeds.$feedId.tsx`, `frontend/src/routes/feeds.$feedId.items.$itemId.tsx`
-   **Components:** `frontend/src/components/FeedList.tsx`, `frontend/src/components/ItemDetailModal.tsx`
-   **Tests:** E2E and Unit tests referencing these specific routes or the "X" button will need to be updated or removed.

## Out of Scope
-   Adding new filtering logic to the main item list.
-   Changes to the "All Items" view.
