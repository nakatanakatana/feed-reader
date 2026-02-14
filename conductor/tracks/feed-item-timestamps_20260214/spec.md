# Track: Per-Feed Publication Timestamps

## Overview
This track introduces per-feed tracking of `published_at` and `created_at` timestamps for items. It enables the system to record when a specific feed published or discovered an item, even if the item is deduplicated across multiple feeds. This data will be exposed via a new RPC method in `ItemService` and displayed in the `ItemDetailModal` UI.

## Functional Requirements

### Database Changes
-   **Schema Update:**
    -   Add a `published_at` column to the `feed_items` table.
    -   Use the existing `created_at` column in `feed_items` to track discovery time per feed.

### Data Ingestion Logic
-   **Feed Fetching:**
    -   When processing an item from a feed:
        -   Update or Insert into the `feed_items` table with the specific `published_at` from that feed's entry.
        -   The main `items.published_at` remains fixed to the value set upon initial item creation (reflecting the first time the item was seen).

### API Changes (RPC)
-   **ItemService Update:**
    -   Add a new RPC method: `GetItemFeeds` (or similar name like `ListItemFeedDetails`) to `ItemService`.
    -   **Request:** `item_id` (string).
    -   **Response:** A list of feed metadata objects, each containing:
        -   `feed_id`
        -   `feed_title`
        -   `published_at` (specific to this feed linkage)
        -   `created_at` (specific to this feed linkage)

### UI Changes
-   **ItemDetailModal:**
    -   Implement a hover/tooltip interaction on the feed source or date display.
    -   On hover, call the new RPC method.
    -   Display the per-feed `published_at` and `created_at` information in a popover/tooltip.

## Non-Functional Requirements
-   **Performance:** The new RPC method should be efficient, utilizing appropriate indices on `feed_items`.
-   **UX:** The tooltip/popover should load asynchronously and display a loading state if necessary.

## Acceptance Criteria
-   [ ] Database migration adds `published_at` to the `feed_items` table.
-   [ ] Ingestion logic correctly populates `feed_items.published_at` during feed updates.
-   [ ] `ItemService` RPC returns correct data for items associated with single or multiple feeds.
-   [ ] `ItemDetailModal` displays a tooltip with per-feed timing information on hover, fetching data via the new RPC method.
