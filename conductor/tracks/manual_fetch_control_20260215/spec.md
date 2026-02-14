# Track: Manual Feed Fetch Control

## Overview
This track introduces a mechanism to explicitly schedule and suspend feed fetching. It transitions the fetch logic from a purely interval-based approach to a database-backed scheduling system. Users will gain the ability to manually suspend updates for specific feeds for a set duration (e.g., to silence noisy feeds or handle errors).

## Functional Requirements

### 1. Database Schema Changes
-   **Consolidate Fetch State:**
    -   Rename `feed_fetcher_cache` table to `feed_fetcher`.
    -   Add `next_fetch` (TEXT/TIMESTAMP) column to `feed_fetcher` to store the scheduled next fetch time.
    -   Move `last_fetched_at` column from `feeds` table to `feed_fetcher` table.
    -   Ensure `feed_fetcher` contains: `feed_id` (PK), `etag`, `last_modified`, `last_fetched_at`, `next_fetch`.
-   **Migration:**
    -   Create migration scripts to handle table renaming, column addition, and data migration for existing feeds.

### 2. Backend Logic Update (Scheduling)
-   **Next Fetch Calculation:**
    -   When a feed is successfully fetched (or initially added), calculate `next_fetch`.
    -   Logic: `next_fetch = CURRENT_TIMESTAMP + FetchInterval` (using the global `FetchInterval` setting).
-   **Fetcher Service Update:**
    -   Modify the polling query to select feeds where `next_fetch <= CURRENT_TIMESTAMP`.
    -   Ensure only scheduled feeds are queued for fetching.

### 3. User Interface (Suspend Feature)
-   **Suspend Options:**
    -   Provide options to suspend fetching for: **1 Day, 3 Days, 1 Week, 1 Month**.
-   **Feed List Interaction:**
    -   **Context Menu:** Add a "Suspend Fetching" submenu to the individual feed action menu.
    -   **Bulk Actions:** Allow users to select multiple feeds in the list and apply a suspend duration to all selected items via the bulk action bar.
-   **Visual Indication (Optional but recommended):**
    -   Indicate feeds that are currently suspended or have a future `next_fetch` date significantly in the future.

### 4. API Extensions
-   **Update Feed Scheduling:**
    -   Expose an RPC method (e.g., `SetFeedSchedule`) to allow the frontend to update the `next_fetch` timestamp for one or multiple feeds.

## Non-Functional Requirements
-   **Performance:** The polling query `WHERE next_fetch <= ...` must be indexed and efficient.
-   **Backward Compatibility:** Ensure existing feeds migrate smoothly and start with a valid `next_fetch` (e.g., set to `now` or preserved `last_fetched_at` + interval).

## Acceptance Criteria
1.  **Schema:** `feed_fetcher` table exists with `next_fetch` and `last_fetched_at`. `feeds` table no longer has `last_fetched_at`.
2.  **Scheduling:** Feeds are not fetched before their `next_fetch` time.
3.  **Auto-Update:** After a fetch, `next_fetch` is automatically updated to `now + FetchInterval`.
4.  **Manual Suspend:** User can select a feed (or multiple) and set `next_fetch` to 1 day/week/etc. in the future. The backend respects this and does not fetch until that time passes.
5.  **UI:** Options appear in the correct menus and correctly trigger the API.

## Out of Scope
-   Adaptive/Variable fetch intervals based on feed activity (logic remains fixed interval).
-   Detailed scheduling (e.g., "Fetch only at 8:00 AM").
