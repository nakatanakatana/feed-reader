# Implementation Plan: HTTP Caching for Feed Fetcher

## Phase 1: Database Schema and Data Access
- [ ] Task: Add the `feed_fetcher_caches` table definition to `sql/schema.sql`.
- [ ] Task: Add SQL queries to `sql/query.sql` for CRUD operations on `feed_fetcher_caches`.
- [ ] Task: Run `sqlc generate` to update the Go database code.
- [ ] Task: Create a unit test in `store/` to verify cache data persistence.
- [ ] Task: Conductor - User Manual Verification 'Phase 1: Database Schema and Data Access' (Protocol in workflow.md)

## Phase 2: Fetcher Service Integration
- [ ] Task: Modify `cmd/feed-reader/fetcher.go` to include cache lookup logic before making HTTP requests.
- [ ] Task: Update the HTTP client logic to include `If-None-Match` and `If-Modified-Since` headers.
- [ ] Task: Implement handling for `304 Not Modified` responses to skip processing.
- [ ] Task: Implement logic to update or delete cache info based on `200 OK` or error responses.
- [ ] Task: Add unit tests in `cmd/feed-reader/fetcher_test.go` using a mock HTTP server to verify conditional GET behavior.
- [ ] Task: Conductor - User Manual Verification 'Phase 2: Fetcher Service Integration' (Protocol in workflow.md)

## Phase 3: Integration and Verification
- [ ] Task: Run end-to-end fetching tests to ensure that the caching layer works correctly with real or simulated feed responses.
- [ ] Task: Verify that error cases (e.g., 500 errors) correctly trigger cache clearing.
- [ ] Task: Perform a final code review and linting check.
- [ ] Task: Conductor - User Manual Verification 'Phase 3: Integration and Verification' (Protocol in workflow.md)
