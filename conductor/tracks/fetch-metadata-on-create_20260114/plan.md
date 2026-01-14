# Implementation Plan - Fetch Feed Metadata on Create

## Phase 1: Environment & Dependency Setup [checkpoint: 6492f36]
- [x] Task: Add `gofeed` and `hashicorp/go-retryablehttp` dependencies d8ec730
    - [x] Run `go get github.com/mmcdole/gofeed`
    - [x] Run `go get github.com/hashicorp/go-retryablehttp`
    - [x] Run `go mod tidy` (Skipped tidy to preserve indirect deps until usage)
- [x] Task: Conductor - User Manual Verification 'Phase 1: Environment & Dependency Setup' (Protocol in workflow.md)

## Phase 2: Feed Fetching Service Implementation [checkpoint: d8660dc]
- [x] Task: Define Feed Fetching Interface and Data Structures f14773a
    - [x] Create an internal service or package for feed fetching if necessary
- [x] Task: Write Tests for Feed Fetcher (Red Phase) 1ed5056
    - [x] Create `cmd/feed-reader/fetcher_test.go`
    - [x] Mock HTTP responses for various feed types (RSS, Atom, Invalid)
    - [x] Test success cases and error cases (timeout, invalid XML)
- [x] Task: Implement Feed Fetcher (Green Phase) f4efb73
    - [x] Implement the fetching logic using `gofeed` and `retryablehttp`
    - [x] Ensure all tests pass
- [x] Task: Refactor and Verify Coverage 01688e7
    - [x] Refactor fetcher code for better readability
    - [x] Verify coverage is > 80%
- [x] Task: Conductor - User Manual Verification 'Phase 2: Feed Fetching Service Implementation' (Protocol in workflow.md)

## Phase 3: Update CreateFeed Handler
- [x] Task: Update CreateFeed Handler Tests (Red Phase) 09a3a62
    - [x] Modify `cmd/feed-reader/handler_test.go` to expect metadata in the saved feed
    - [x] Ensure tests fail because metadata is not being fetched yet
- [x] Task: Integrate Fetcher into CreateFeed Handler (Green Phase) 3aadcf2
    - [x] Update `handler.go` to use the fetcher before saving to DB
    - [x] Map `gofeed` fields to DB columns
    - [x] Update SQL query if necessary (checking `sqlc` usage)
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
