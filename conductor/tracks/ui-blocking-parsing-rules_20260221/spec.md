# UI Adjustment for Blocking & Parsing Rules

## Overview
This track focuses on improving the user interface for the Blocking Rules and Parsing Rules management pages. The goal is to enhance usability by introducing a modal for bulk operations and optimizing the list layout to maximize screen real estate, aligning it with the existing Feeds page design.

## Functional Requirements

### 1. Bulk Import Blocking Rules (Modal)
-   **Trigger:** A new "Bulk Import" button must be added immediately to the **right** of the existing "Add Rule" button on the Blocking Rules page.
-   **Interaction:** Clicking the button opens a modal dialog for bulk importing blocking rules.
-   **Behavior:**
    -   The modal should contain a text area for inputting rules (newline separated).
    -   Upon successful import, the modal must **automatically close**.
    -   A success toast notification should be displayed to confirm the action.

### 2. Blocking Rules List Layout
-   **Full Width:** The list of configured blocking rules must span the full width of the available content area.
-   **Independent Scroll:** The list container must be independently scrollable, keeping the page header and action buttons (Add Rule, Bulk Import) sticky or fixed at the top. This mimics the behavior of the main Feeds list.

### 3. Parsing Rules List Layout
-   **Full Width:** The list of configured parsing rules must span the full width of the available content area.
-   **Independent Scroll:** Similar to the Blocking Rules, the parsing rules list container must be independently scrollable with a sticky/fixed header area.

## Non-Functional Requirements
-   **Consistency:** The visual style and behavior of the new list layouts must strictly match the existing Feeds page implementation to ensure a unified user experience.
-   **Responsiveness:** The layout changes must remain responsive and functional on smaller screens, ensuring the list remains accessible.

## Acceptance Criteria
-   [ ] The "Bulk Import" button appears to the right of "Add Rule" on the Blocking Rules page.
-   [ ] Clicking "Bulk Import" opens a modal.
-   [ ] Submitting valid rules in the modal adds them, closes the modal, and shows a success toast.
-   [ ] The Blocking Rules list uses the full width of the container.
-   [ ] The Blocking Rules list scrolls independently while the header remains visible.
-   [ ] The Parsing Rules list uses the full width of the container.
-   [ ] The Parsing Rules list scrolls independently while the header remains visible.
