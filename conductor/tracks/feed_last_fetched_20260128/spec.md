# Specification: Display Last Fetched Date in Feed List

## Overview
To help users understand the freshness of each feed, display the last fetched timestamp (`last_fetched_at`) for each item in the feed list.

## Functional Requirements
- Display the last fetched date and time for each item in the feed list (near the title).
- Use an absolute time format (e.g., `2026-01-28 15:30`).
- If a feed has never been fetched (`last_fetched_at` is null), display a placeholder text such as "Never".

## Non-Functional Requirements
- Ensure the layout remains responsive and does not break the existing UI.
- Verify that the `last_fetched_at` data is correctly passed from the backend to the frontend.

## Acceptance Criteria
- Each feed card in the list shows the date in `YYYY-MM-DD HH:MM` format.
- Feeds with no fetch history show "Never" (or equivalent placeholder).
- The display is visually consistent across both desktop and mobile views.

## Out of Scope
- User settings for date formatting.
- Toggle between relative and absolute time.
