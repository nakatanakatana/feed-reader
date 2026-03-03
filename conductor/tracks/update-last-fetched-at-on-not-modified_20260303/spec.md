# Track Specification: Update last_fetched_at on Not Modified

## Overview
Currently, the application updates the `last_fetched_at` timestamp for a feed only when it receives a 200 OK response with new content. When a fetch attempt results in a `304 Not Modified` (based on ETag or Last-Modified), the `last_fetched_at` is updated in background fetches (`FetchAndSave`), but not in manual synchronous fetches (`fetchAndSaveSync`). This track aims to ensure `last_fetched_at` is updated for any successful check (200 OK or 304 Not Modified), including manual refreshes, while still skipping the update for failed fetches (40x/50x).

## Functional Requirements
- When a manual feed refresh is triggered (`FetchFeedsByIDsSync`), `last_fetched_at` must be updated even if the server returns `304 Not Modified`.
- The "Next fetch" time should also be recalculated and updated on `304 Not Modified` to prevent immediate re-fetching.
- Failed fetch attempts (HTTP 4xx or 5xx, or network errors) must NOT update `last_fetched_at`.
- Both background fetches and manual synchronous fetches should behave consistently regarding these updates.

## Non-Functional Requirements
- Maintain performance by updating these fields efficiently (leveraging the existing `writeQueue`).
- Ensure type safety and adhere to existing Go patterns in the project.

## Acceptance Criteria
- [ ] Manual refresh of a feed that returns `304 Not Modified` results in an updated `last_fetched_at` timestamp in the database.
- [ ] Background fetch of a feed that returns `304 Not Modified` continues to update `last_fetched_at` and `next_fetch`.
- [ ] Fetching a feed that returns `404 Not Found` or `500 Internal Server Error` does NOT update `last_fetched_at`.
- [ ] Unit tests verify these behaviors for both `FetchAndSave` and `fetchAndSaveSync`.

## Out of Scope
- Changing the adaptive interval calculation logic itself (only ensuring it's called on 304).
- Handling 3xx redirects that are not 304 (these are already handled by the HTTP client).
