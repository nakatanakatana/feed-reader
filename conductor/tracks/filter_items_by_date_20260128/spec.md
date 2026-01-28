# Track Specification: Filter Items by Date

## Overview
Currently, items can be filtered by feed, tag, or read status. This track adds a date-based filtering capability to allow users to see items published (or created) within specific time ranges (e.g., "Past 24 hours").

## Functional Requirements
- **Date Filter Presets**: The UI shall provide a dropdown or similar selection for date ranges:
  - All Time (Default)
  - Past 24 Hours
  - Past 7 Days
  - Past 30 Days
- **Filter Logic**:
  - The filter shall apply to `COALESCE(published_at, created_at)`.
  - It shall be a "since" filter (i.e., items with a date greater than or equal to the calculated start time).
- **Combination**: The date filter shall work in conjunction with existing filters (Feed ID, Tag ID, Is Read) using an AND condition.
- **Backend API**:
  - Update `ListItemsRequest` in Protobuf to include an optional `published_since` timestamp.
  - Update backend handler and storage layer to incorporate this filter into the SQL queries.
- **Frontend**:
  - Add a "Date Filter" selector to the `ItemList` or header area.
  - Ensure the selected filter is reflected in the API requests.

## Non-Functional Requirements
- **Performance**: The SQL query should remain efficient when combining multiple filters.
- **Consistency**: The logic for choosing between `published_at` and `created_at` must match the existing sorting logic.

## Acceptance Criteria
- [ ] Users can select "Past 24 Hours" and see only items from the last 24 hours.
- [ ] Users can combine the date filter with the "Unread only" toggle.
- [ ] Selecting "All Time" clears the date filter.
- [ ] The filter correctly handles items that lack a `published_at` date by falling back to `created_at`.

## Out of Scope
- Custom date range selection (calendar picker).
- "Before" (until) date filtering.
