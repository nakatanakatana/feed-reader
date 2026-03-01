# Specification: Fix Next Fetch display on Feed List

## Overview
The "Next fetch" timestamp for a feed is not displayed when it is in the past. This occurs because the UI explicitly checks if the next fetch time is in the future before rendering. When a fetch is overdue, it should instead display "Soon" to indicate it will be picked up by the scheduler shortly.

## Functional Requirements
- Update the `FeedList` component to display "Soon" when the `nextFetch` timestamp is in the past.
- Maintain the current display of the relative time if the `nextFetch` is in the future.
- Ensure "Soon" is styled consistently with the future fetch time (e.g., using `orange.600`).

## Acceptance Criteria
- If `nextFetch` is in the future, display "Next fetch: [relative time]".
- If `nextFetch` is in the past, display "Next fetch: Soon".
- If `nextFetch` is missing, do not display the "Next fetch" line.

## Out of Scope
- Changes to the background scheduler logic.
- Changes to how the backend calculates `next_fetch_at`.
- Changes to other feed management features (e.g., manual refresh, suspension).
