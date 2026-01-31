# Specification: Immediate Feed Fetch ("Fetch Now")

## 1. Overview
This track introduces the ability for users to manually trigger an immediate fetch for one or more feeds directly from the Feed List page. This bypasses the background scheduler's timing, allowing users to see the latest content on demand.

## 2. Functional Requirements

### 2.1 Backend API
- Implement a new endpoint `FetchFeeds` (or similar) in the `FetcherService` to trigger immediate ingestion for a list of feed IDs.
- The service must ensure that if a fetch is already in progress for a feed, redundant requests are ignored or synchronized to avoid race conditions.
- The response should include the status of the fetch operation (success/failure) and ideally the number of new items found.

### 2.2 Frontend UI: Entry Points
- **Context Menu:** Add a "Fetch Now" option to the kebab/context menu of individual feed items in the `FeedList`.
- **Bulk Actions:** Add a "Fetch Selected" button to the bulk actions toolbar that appears when one or more feeds are selected.

### 2.3 Frontend UI: Feedback & State
- **Loading Indicator:** When a fetch is triggered, display an in-line loading spinner or indicator within the specific feed row(s).
- **Concurrency Control:** Disable the "Fetch Now" action for feeds that are currently being fetched.
- **Error Handling:** If a fetch fails, replace the loading indicator with an error icon. Display the error details (e.g., "Network error", "Invalid feed format") in a tooltip when hovering over the error icon.
- **Automatic Refresh:** Upon successful completion, update the unread counts for the affected feeds and tags in the UI.

## 3. Non-Functional Requirements
- **Responsiveness:** The UI should remain responsive while fetches are processing.
- **Robustness:** Network failures or malformed feeds during a manual fetch should be handled gracefully without crashing the UI.

## 4. Acceptance Criteria
- User can trigger a fetch for a single feed via the context menu.
- User can trigger a fetch for multiple selected feeds via the bulk actions toolbar.
- A loading spinner is visible during the fetch process.
- After a successful fetch, unread counts are updated if new items were found.
- If a fetch fails, an error icon with a tooltip is displayed.
- The "Fetch Now" action is disabled if a fetch for that feed is already active.

## 5. Out of Scope
- Modifying the background scheduler's logic or frequency.
- Real-time "Live" updates via WebSockets or Server-Sent Events (updates occur upon completion of the manual fetch request).
