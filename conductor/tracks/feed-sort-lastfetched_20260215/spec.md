# Track: Feed Sort by Last Fetched

## Overview
This feature introduces the ability to sort the list of feeds based on their `lastFetchedAt` timestamp.
This enhancement allows users to easily identify feeds that have not been updated for a long time or have never been fetched.

## Functional Requirements

### 1. Sort Option Addition
- Add a new option **"Last Fetched"** to the "Sort by" dropdown menu on the Feed List screen (`FeedList.tsx`).

### 2. Sorting Logic
- **Order:** Ascending (Oldest to Newest).
- **Unfetched Feeds:**
    - Feeds with a `null` or `undefined` `lastFetchedAt` value must appear at the **top of the list** (treated as the oldest/most urgent).
- **Tie-breaker:**
    - If `lastFetchedAt` is identical or both are undefined, sort by `title` (Ascending) as a secondary sort key.

## Non-Functional Requirements
- **Performance:** Implement efficient client-side sorting using existing TanStack DB capabilities without blocking UI rendering.
- **Data Source:** Utilize the existing frontend data store (`feed-db.ts`) without modifying backend APIs.

## Acceptance Criteria
- [ ] "Last Fetched" option is visible and selectable in the "Sort by" menu.
- [ ] Selecting "Last Fetched" reorders the feed list by last fetched date (ascending).
- [ ] Feeds that have never been fetched (`lastFetchedAt` is missing) appear at the top of the list.
- [ ] Existing sort options "Title (A-Z)" and "Title (Z-A)" continue to function correctly.
