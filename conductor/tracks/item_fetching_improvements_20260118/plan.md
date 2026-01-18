# Implementation Plan - Item Fetching Improvements

## Phase 1: API Contract & Immediate Fetching [checkpoint: 8d7a11d]
- [x] Task: Update Protobuf Definition for `RefreshFeeds` 65e7060
    - [ ] Add `RefreshFeeds(RefreshFeedsRequest) returns (RefreshFeedsResponse)` to `FeedService` in `proto/feed/v1/feed.proto`.
    - [ ] Define `RefreshFeedsRequest` with `repeated string uuids = 1`.
    - [ ] Run `buf generate` to update Go and TypeScript code.
- [x] Task: Implement Immediate Fetching in `CreateFeed` 8905ebc
    - [ ] Modify `CreateFeed` in `cmd/feed-reader/handler.go` to call `fetcherService.FetchAndSave` asynchronously or synchronously after storage.
- [ ] Task: Conductor - User Manual Verification 'API Contract & Immediate Fetching' (Protocol in workflow.md)

## Phase 2: Core Logic Improvements (Interval & Jitter) [checkpoint: f946a64]
- [x] Task: Implement Jitter in `Scheduler` ec0c8c7
    - [ ] Modify `Scheduler` in `cmd/feed-reader/scheduler.go` to accept a jitter configuration or implement a simple random delay for each tick.
- [x] Task: Implement Interval Check in `FetcherService` b9c36e8
    - [ ] Add `fetch_interval` to `FetcherService` configuration.
    - [ ] Update `FetchAllFeeds` in `cmd/feed-reader/fetcher_service.go` to filter feeds based on `last_fetched_at` + `fetch_interval`.
- [x] Task: Update `FetcherService` to support Refresh by IDs 8e6af45
    - [ ] Add `FetchFeedsByIDs(ctx context.Context, uuids []string)` to `FetcherService`.
    - [ ] Ensure this method bypasses the interval check.
- [ ] Task: Conductor - User Manual Verification 'Core Logic Improvements' (Protocol in workflow.md)

## Phase 3: Refresh API Implementation & Integration [checkpoint: 00683e6]
- [x] Task: Implement `RefreshFeeds` RPC Handler d85de13
    - [ ] Add `RefreshFeeds` implementation to `FeedServer` in `cmd/feed-reader/handler.go`.
    - [ ] Wire it up to `fetcherService.FetchFeedsByIDs`.
- [x] Task: Final Verification 00683e6
    - [ ] Write unit tests for the interval check logic in `FetcherService`.
    - [ ] Verify jitter behavior via logs.
    - [ ] Perform manual verification of `RefreshFeeds` via `curl`.
- [ ] Task: Conductor - User Manual Verification 'Refresh API & Final Integration' (Protocol in workflow.md)
