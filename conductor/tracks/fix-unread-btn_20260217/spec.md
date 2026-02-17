# Track Specification: Fix Mark as Unread Button in ItemDetailModal

## 1. Overview
Currently, the `ItemDetailModal` fails to display the "Mark as Unread" button when an item is in the "Read" state. Instead, it persistently shows the "Mark as Read" button regardless of the item's actual status. This prevents users from manually reverting an item to "Unread" from the modal view.

The goal of this track is to fix the logic within `ItemDetailModal` to ensure the action button correctly toggles between "Mark as Read" and "Mark as Unread" based on the item's current state.

## 2. Scope
### In Scope
-   Investigating and fixing the conditional rendering logic for the read/unread action button in `frontend/src/components/ItemDetailModal.tsx` (or related files).
-   Ensuring the button state updates immediately upon user interaction (optimistic UI).
-   Verifying the fix works across all device types (Desktop and Mobile).

### Out of Scope
-   Modifying the "Mark as Read" logic in the main feed list view.
-   Redesigning the visual appearance of the button (functionality fix only).

## 3. Functional Requirements
-   **FR1:** The `ItemDetailModal` must accurately detect the `read` status of the currently displayed item.
-   **FR2:** When an item is **Read**, the primary action button must display "Mark as Unread" (or an equivalent icon indicating the action to mark as unread).
-   **FR3:** When an item is **Unread**, the primary action button must display "Mark as Read".
-   **FR4:** Clicking the button must toggle the item's state and immediately update the button's label/icon to reflect the new inverse action.

## 4. Reproduction Steps
1.  Open the application and select any feed.
2.  Click on an item that is already marked as **Read** to open the `ItemDetailModal`.
3.  **Observation:** The action button incorrectly displays "Mark as Read" (or is missing the "Mark as Unread" option).
4.  Click on an item that is **Unread**.
5.  Click the "Mark as Read" button.
6.  **Observation:** The button remains as "Mark as Read" instead of switching to "Mark as Unread".

## 5. Acceptance Criteria
-   [ ] Opening a **Read** item in the modal shows the "Mark as Unread" option.
-   [ ] Opening an **Unread** item shows the "Mark as Read" option.
-   [ ] Clicking "Mark as Read" changes the button state to "Mark as Unread" immediately.
-   [ ] Clicking "Mark as Unread" changes the button state to "Mark as Read" immediately.
-   [ ] The state change is persisted to the backend/store.
