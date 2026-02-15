# Track Specification: Set User-Agent for Feed Fetching

## Overview
Configure the backend to include a specific User-Agent (`FeedFetcher/1.0`) in the request headers when fetching RSS/Atom feeds. This identifies the application to remote servers and ensures better compatibility.

## Business Value / Motivation
Many web servers block default User-Agents (like the standard Go library) or prioritize requests with well-defined identifiers. Using a custom User-Agent improves the reliability and stability of feed fetching.

## Functional Requirements
- Include the `User-Agent: FeedFetcher/1.0` header in all HTTP requests initiated by `GofeedFetcher` in `cmd/feed-reader/fetcher.go`.
- Define the User-Agent string as a constant within `cmd/feed-reader/fetcher.go`.
- Apply this setting consistently across the `retryablehttp` client used for feed fetching.

## Non-Functional Requirements
- Minimize performance overhead.
- Ensure existing functionality and tests remain intact.

## Acceptance Criteria
- [ ] All HTTP requests sent via `GofeedFetcher.Fetch` contain the header `User-Agent: FeedFetcher/1.0`.
- [ ] Automated tests verify that the `User-Agent` header is correctly set in outgoing requests.

## Out of Scope
- Setting the User-Agent for non-feed fetching HTTP requests (if any are added in the future).
- Dynamic loading of the User-Agent string from configuration files or environment variables.
