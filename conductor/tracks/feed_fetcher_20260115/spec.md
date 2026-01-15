# Track Specification: Background Feed Fetcher & Item Storage

## Overview
Implement a background process that periodically fetches registered RSS/Atom feeds, creates unique article entries based on URL, and associates them with the source feeds. Additionally, implement a normalized database schema where content, feed associations, and read statuses are stored in separate tables.

## Functional Requirements

### 1. Scheduler & Concurrency
-   **Trigger:** The system must start a background scheduler upon application startup using a `time.Ticker`.
-   **Interval:** The fetch interval should be configurable (defaulting to e.g., 10 minutes).
-   **Concurrency:** Use a Worker Pool pattern to fetch multiple feeds in parallel (e.g., limit to 5 concurrent fetches).

### 2. Data Modeling
Create three new database tables to fully decouple concerns:

-   **Table: `items`** (Stores unique article content)
    -   `id` (PK, UUID)
    -   `url` (Unique Key - for deduplication)
    -   `title`
    -   `description` (or content)
    -   `published_at`
    -   `guid` (from RSS/Atom standard)
    -   `created_at`
    -   `updated_at`

-   **Table: `feed_items`** (Associates Items with Feeds)
    -   `feed_id` (FK to `feeds.uuid`)
    -   `item_id` (FK to `items.id`)
    -   `created_at`
    -   `updated_at`
    -   *Constraint:* Composite unique key on `(feed_id, item_id)`.

-   **Table: `item_reads`** (Manages Read Status)
    -   `item_id` (FK to `items.id`)
    -   `is_read` (Boolean, default false)
    -   `read_at` (Timestamp, nullable)
    -   `created_at`
    -   `updated_at`
    -   *Note:* In a future multi-user system, a `user_id` column would be added here. For now, it tracks the system-wide/single-user read state.

### 3. Fetching Logic
-   Iterate through all registered feeds.
-   For each feed, fetch and parse the XML.
-   **Deduplication & Association Strategy:**
    1.  **Item (Content):** Check if `items.url` exists. Insert only if new. Get the `item_id`.
    2.  **Association:** Upsert (or Insert ignore) into `feed_items` with `feed_id` and `item_id`.
    3.  **Read State:** Ensure a record exists in `item_reads` for the `item_id` (defaulting to unread if new).

## Non-Functional Requirements
-   **Error Handling:** Feed fetch failures are logged but do not stop the batch.
-   **Performance:** Use transactions for multi-table inserts to ensure data integrity.

## Acceptance Criteria
-   [ ] Database migrations for `items`, `feed_items`, and `item_reads` are created and applied.
-   [ ] Background worker runs at the defined interval using a ticker.
-   [ ] Feeds are fetched concurrently.
-   [ ] Unique items are stored in `items` (deduplicated by URL).
-   [ ] Links are stored in `feed_items`.
-   [ ] Default read status is initialized in `item_reads`.
