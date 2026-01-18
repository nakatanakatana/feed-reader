# Implementation Plan - Item Fetching Improvements

## Phase 1: API Contract & Immediate Fetching
- [x] Task: Update Protobuf Definition for `RefreshFeeds` 65e7060
    - [ ] Add `RefreshFeeds(RefreshFeedsRequest) returns (RefreshFeedsResponse)` to `FeedService` in `proto/feed/v1/feed.proto`.
    - [ ] Define `RefreshFeedsRequest` with `repeated string uuids = 1`.
    - [ ] Run `buf generate` to update Go and TypeScript code.
- [ ] Task: Implement Immediate Fetching in `CreateFeed`
    - [ ] Modify `CreateFeed` in `cmd/feed-reader/handler.go` to call `fetcherService.FetchAndSave` asynchronously or synchronously after storage.
- [ ] Task: Conductor - User Manual Verification 'API Contract & Immediate Fetching' (Protocol in workflow.md)

## Phase 2: Core Logic Improvements (Interval & Jitter)
- [ ] Task: Implement Jitter in `Scheduler`
    - [ ] Modify `Scheduler` in `cmd/feed-reader/scheduler.go` to accept a jitter configuration or implement a simple random delay for each tick.
- [ ] Task: Implement Interval Check in `FetcherService`
    - [ ] Add `fetch_interval` to `FetcherService` configuration.
    - [ ] Update `FetchAllFeeds` in `cmd/feed-reader/fetcher_service.go` to filter feeds based on `last_fetched_at` + `fetch_interval`.
- [ ] Task: Update `FetcherService` to support Refresh by IDs
    - [ ] Add `FetchFeedsByIDs(ctx context.Context, uuids []string)` to `FetcherService`.
    - [ ] Ensure this method bypasses the interval check.
- [ ] Task: Conductor - User Manual Verification 'Core Logic Improvements' (Protocol in workflow.md)

## Phase 3: Refresh API Implementation & Integration
- [ ] Task: Implement `RefreshFeeds` RPC Handler
    - [ ] Add `RefreshFeeds` implementation to `FeedServer` in `cmd/feed-reader/handler.go`.
    - [ ] Wire it up to `fetcherService.FetchFeedsByIDs`.
- [ ] Task: Final Verification
    - [ ] Write unit tests for the interval check logic in `FetcherService`.
    - [ ] Verify jitter behavior via logs.
    - [ ] Perform manual verification of `RefreshFeeds` via `curl`.
- [ ] Task: Conductor - User Manual Verification 'Refresh API & Final Integration' (Protocol in workflow.md)
