# Specification: Dynamic Favicon for Unread Counts

## Overview
Implement a dynamic favicon that visually indicates the accumulation of unread feed items. The favicon's color will shift based on the total number of unread articles, providing users with a passive, at-a-glance status update directly in their browser tab.

## Functional Requirements
1.  **Real-time Monitoring:** The application must track the total count of unread items in real-time.
2.  **Dynamic Updates:** The browser tab's favicon must update immediately when the unread count crosses specific threshold tiers.
3.  **Color Coding:** The favicon color must reflect the urgency/volume of unread items using the defined tiers.

## Tiers & Visuals
| Unread Count | Status | Color |
| :--- | :--- | :--- |
| **0** | Empty | **Neutral** (Default/Gray) |
| **1 - 10** | Low | **Blue** |
| **11 - 50** | Medium | **Yellow** |
| **51+** | High | **Red** |

## Technical Implementation
-   **Method:** Client-side SVG Manipulation.
-   **Mechanism:**
    -   Fetch or embed the base `favicon.svg`.
    -   Use JavaScript to modify the `fill` or `stroke` properties of the SVG based on the current tier.
    -   Encode the modified SVG (e.g., Data URI) and update the `<link rel="icon">` tag in the document head.
-   **Performance:** Updates should be efficient and not cause noticeable UI jank.

## Acceptance Criteria
-   [ ] Favicon displays the **Neutral** color when there are 0 unread items.
-   [ ] Favicon updates to **Blue** when unread count is 1-10.
-   [ ] Favicon updates to **Yellow** when unread count is 11-50.
-   [ ] Favicon updates to **Red** when unread count is 51+.
-   [ ] The icon updates immediately when items are marked as read or new items are fetched.
-   [ ] The feature works reliably across modern browsers (Chrome, Firefox, Edge, Safari).
