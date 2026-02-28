# Specification: Improve Adaptive Fetch Logic

## Overview
Improve the adaptive fetch logic to adjust fetch frequency based on historical update patterns. The system will analyze each feed's update history across a weekly cycle (168-hour buckets) and automatically increase fetch frequency during peak periods identified from past item publication times. This aim is to improve content freshness while optimizing resource usage during inactive periods.

## Functional Requirements
1.  **Update Pattern Analysis**
    *   For each feed, aggregate item update history from the last 14 days into 1-hour buckets corresponding to a 168-hour weekly cycle (24 hours * 7 days).
    *   Primary timestamp for analysis is "Published At". If unavailable, use "Created At" (Discovery time) as a fallback (Hybrid approach).
2.  **Fetch Interval Calculation**
    *   **Base Frequency:** Calculated using the current logic based on overall update history (ranging from 15 minutes to 24 hours).
    *   **Peak Adjustment:** If the next scheduled fetch time falls within a high-activity "peak" period identified from the analysis, the system will reduce the interval to increase fetch frequency.
    *   **Limits:** The adjusted interval must remain within the existing bounds: a minimum of 15 minutes and a maximum of 24 hours.
3.  **Database Extension**
    *   Consider efficient data structures or caching for the 168-hour update distribution to avoid heavy computation during each scheduling cycle.

## Non-Functional Requirements
1.  **Performance:** Ensure that fetch interval calculations do not significantly impact the performance of the background scheduler.
2.  **Data Recency:** Prioritize the last 14 days of data to reflect current publication trends accurately.

## Acceptance Criteria
*   Fetch frequency increases automatically during identified peak periods for a given feed.
*   The system strictly adheres to the existing 15-minute to 24-hour interval limits.
*   Background fetch operations remain stable and performant after the new logic is introduced.

## Out of Scope
*   Real-time push notifications for feed updates.
*   User-facing customization of fetch intervals or peak settings in the frontend.
