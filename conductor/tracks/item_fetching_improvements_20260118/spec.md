# Specification: Item Fetching Improvements

## Overview
Improve the feed fetching mechanism to prevent server load spikes and ensure articles are updated at appropriate intervals. This track includes implementing jitter in the scheduler, enforcing fetch intervals based on last fetch time, providing a new API to force refresh specific feeds, and ensuring immediate item fetching upon feed creation.

## Functional Requirements

### 1. Adaptive Scheduling with Jitter
- The scheduler will no longer trigger fetches for all feeds at once.
- Implement "Jitter" when calculating the next fetch time for a feed to spread the load over time (e.g., adding a random delay within a certain percentage of the interval).

### 2. Interval-Based Fetching
- A feed should only be fetched by the background task if its `last_fetched_at` timestamp plus the configured `fetch_interval` is less than the current time.
- The `fetch_interval` will be managed globally via environment variables for now.

### 3. Force Refresh API (RefreshFeeds)
- Add a new RPC `RefreshFeeds` to the `FeedService`.
- The API accepts a list of feed UUIDs to be refreshed immediately.
- Triggering a force refresh bypasses the interval check but updates the `last_fetched_at` timestamp upon completion.

### 4. Fetch on Create
- When a new feed is successfully created via `CreateFeed`, automatically trigger an immediate fetch and save of its items.
- This ensures the user sees content immediately after adding a feed.

## Data Model
- **Feeds Table**: Uses the existing `last_fetched_at` column to track the last successful fetch.
- No schema changes are anticipated.

## Non-Functional Requirements
- **Performance**: Ensure the scheduler efficiently identifies feeds that need fetching without significant overhead.
- **Reliability**: Force refresh should handle multiple IDs and process them through the existing worker pool to maintain concurrency limits.

## Acceptance Criteria
- [ ] Background fetching spreading is observable via logs (not all feeds starting at the same millisecond).
- [ ] Scheduler skips feeds that were fetched recently (within the interval).
- [ ] `RefreshFeeds` API successfully triggers immediate fetching for multiple specified feed IDs.
- [ ] Newly created feeds have their items populated immediately without waiting for the next scheduler tick.
- [ ] Manual verification using `curl` or a test client confirms the new RPC functionality.

## Out of Scope
- Per-feed custom intervals (using a global default for now).
- UI implementation for the "Refresh" button (API only).
