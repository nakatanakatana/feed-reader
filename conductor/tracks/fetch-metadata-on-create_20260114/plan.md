# Implementation Plan - Fetch Feed Metadata on Create

## Phase 1: Environment & Dependency Setup [checkpoint: 6492f36]
- [x] Task: Add `gofeed` and `hashicorp/go-retryablehttp` dependencies d8ec730
    - [x] Run `go get github.com/mmcdole/gofeed`
    - [x] Run `go get github.com/hashicorp/go-retryablehttp`
    - [x] Run `go mod tidy` (Skipped tidy to preserve indirect deps until usage)
- [x] Task: Conductor - User Manual Verification 'Phase 1: Environment & Dependency Setup' (Protocol in workflow.md)

## Phase 2: Feed Fetching Service Implementation
- [x] Task: Define Feed Fetching Interface and Data Structures f14773a
    - [x] Create an internal service or package for feed fetching if necessary
- [ ] Task: Write Tests for Feed Fetcher (Red Phase)
    - [ ] Create `cmd/feed-reader/fetcher_test.go`
    - [ ] Mock HTTP responses for various feed types (RSS, Atom, Invalid)
    - [ ] Test success cases and error cases (timeout, invalid XML)
- [ ] Task: Implement Feed Fetcher (Green Phase)
    - [ ] Implement the fetching logic using `gofeed` and `retryablehttp`
    - [ ] Ensure all tests pass
- [ ] Task: Refactor and Verify Coverage
    - [ ] Refactor fetcher code for better readability
    - [ ] Verify coverage is > 80%
- [ ] Task: Conductor - User Manual Verification 'Phase 2: Feed Fetching Service Implementation' (Protocol in workflow.md)

## Phase 3: Update CreateFeed Handler
- [ ] Task: Update `CreateFeed` Handler Tests (Red Phase)
    - [ ] Modify `cmd/feed-reader/handler_test.go` to expect metadata in the saved feed
    - [ ] Ensure tests fail because metadata is not being fetched yet
- [ ] Task: Integrate Fetcher into `CreateFeed` Handler (Green Phase)
    - [ ] Update `handler.go` to use the fetcher before saving to DB
    - [ ] Map `gofeed` fields to DB columns
    - [ ] Update SQL query if necessary (checking `sqlc` usage)
- [ ] Task: Refactor and Verify Coverage
    - [ ] Refactor handler logic
    - [ ] Verify overall coverage
- [ ] Task: Conductor - User Manual Verification 'Phase 3: Update CreateFeed Handler' (Protocol in workflow.md)

## Phase 4: Final Integration & Cleanup
- [ ] Task: End-to-End Manual Verification
    - [ ] Test the full flow from API request to DB state
- [ ] Task: Final Code Review and Quality Gate Check
    - [ ] Check linting, formatting, and documentation
- [ ] Task: Conductor - User Manual Verification 'Phase 4: Final Integration & Cleanup' (Protocol in workflow.md)
