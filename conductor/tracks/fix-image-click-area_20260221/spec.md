# Specification: Fix ItemDetailModal Image Click Area

## 1. Overview
In the `ItemDetailModal` component, images within the content section currently have a click area that extends to the full width of the container, even when the image is rendered smaller (e.g., scaled down or centered). This causes unintended triggers of the image click action (such as opening the image viewer) when users click on the whitespace surrounding the image. This track aims to adjust the CSS so that the clickable area matches the actual rendered width of the image.

## 2. Functional Requirements
-   **Target:** `ItemDetailModal` component.
-   **Behavior:** The clickable area of images in the content section must strictly match the rendered dimensions of the image.
-   **Constraint:**
    -   Must function correctly across all screen sizes (responsive).
    -   Must not negatively impact the visual layout (e.g., centering, aspect ratio) of the images.

## 3. Non-Functional Requirements
-   **Usability:** Improve precision of user interactions.
-   **Performance:** No negative impact.

## 4. Acceptance Criteria
-   [ ] In `ItemDetailModal`, clicking the whitespace to the left or right of a centered/scaled-down image does **not** trigger the image click handler.
-   [ ] Clicking the image itself **does** trigger the handler.
-   [ ] Visual layout remains consistent (centering and positioning are preserved).
-   [ ] Verified on both Desktop and Mobile viewports.
-   [ ] Automated tests (e.g., Playwright/Vitest) confirm the structural or behavioral fix.

## 5. Out of Scope
-   Changes to image displays in other components (e.g., Feed List).
-   Modifications to the logic of the image viewer modal itself.
