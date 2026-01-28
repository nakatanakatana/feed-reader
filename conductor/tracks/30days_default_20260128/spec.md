# Track: Set Default Date Range to 30 Days for Item List

Change the default date filter on the main Item List page from "All" to "30 Days" and ensure this state is reflected in the URL.

## Overview
By defaulting the date filter to "30 Days" when users access the main item list, we ensure that fresh content is prioritized and loading performance is improved. This default setting will be automatically reflected in the URL query parameters to facilitate easy sharing and bookmarking.

## Functional Requirements
- **Default Change for Main Item List (`/items`):**
    - If the `publishedSince` parameter is missing from the URL, apply `"30d"` (30 days) by default.
    - Ensure the default value is reflected in the URL query parameters upon page access.
- **Scope Maintenance:**
    - Individual lists such as Feed Detail pages and Tag Detail pages will continue to default to "All" (consistent with current behavior).
- **URL Synchronization:**
    - Update the URL query parameters (e.g., `?publishedSince=7d`) when the date filter is changed.
- **Reuse Existing Logic:**
    - Use the existing `"30d"` filtering logic provided by the `getPublishedSince` function.

## Non-Functional Requirements
- **Type Safety:** Maintain TypeScript type definitions (`DateFilterValue`) and validate input from URL parameters.
- **UX:** Clearly indicate the selected state in the UI (`DateFilterSelector`) so users understand the active filter.

## Acceptance Criteria
- [ ] Accessing `/items` sets the date filter to "30 Days" by default.
- [ ] After accessing `/items`, the URL includes `publishedSince=30d`.
- [ ] Feed detail pages (`/feeds/$feedId`) still default to "All".
- [ ] Changing the filter (e.g., to "7 Days") correctly updates the URL parameter.
- [ ] Browser back/forward navigation correctly restores the filter state.

## Out of Scope
- Changes to the logic for other periods (7 days, 24 hours, etc.).
- Backend query optimization (leveraging the existing `publishedSince` parameter processing).
