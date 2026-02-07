# Specification: HTTP Caching for Feed Fetcher

## Overview
Update the backend `fetcher` to utilize HTTP caching (Conditional GET) when retrieving feeds. This will use headers provided by host sites to reduce bandwidth usage and server load.

## Functional Requirements
- **Conditional Request Implementation**:
  - Use `ETag` to send `If-None-Match` headers.
  - Use `Last-Modified` to send `If-Modified-Since` headers.
- **Handling 304 Not Modified**:
  - When a `304` status code is received, skip parsing and database storage as the content has not changed.
- **Persistence of Cache Information**:
  - Create a new database table (e.g., `feed_fetcher_caches`) to store `etag` and `last_modified` values associated with each `feed_id`.
- **Error Handling**:
  - If a conditional request results in a server error (e.g., 5xx), delete the stored cache information for that feed to ensure a clean GET request on the next attempt.

## Non-Functional Requirements
- **Performance**:
  - Cache lookups and updates should not become a bottleneck in the fetching process.
- **Robustness**:
  - Issues with the cache table should not prevent the basic feed fetching functionality.

## Acceptance Criteria
- Verify that appropriate request headers are sent if cache info exists in the DB.
- Verify that `304 Not Modified` responses skip data processing while marking the fetch as successful.
- Verify that `200 OK` responses with new `ETag` or `Last-Modified` headers update the cache table.
- Verify that cache info is cleared when a conditional request fails with a server error.

## Out of Scope
- Local caching based on `Cache-Control: max-age` (skipping the request entirely).
- In-memory cache management (all state will be persisted in the DB).
