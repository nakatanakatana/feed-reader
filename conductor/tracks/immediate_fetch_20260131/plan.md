# Implementation Plan: Immediate Feed Fetch ("Fetch Now")

This plan implements the "Fetch Now" feature, allowing users to manually trigger feed updates from the UI with real-time feedback.

## Phase 1: Backend API Enhancement
- [ ] Task: Update Protobuf for `RefreshFeeds` response
    - [ ] Modify `proto/feed/v1/feed.proto` to add `FeedFetchStatus` and update `RefreshFeedsResponse` to return status and new item counts.
    - [ ] Run `buf generate` to update generated Go and TypeScript code.
- [ ] Task: Implement synchronous fetch logic in `FetcherService`
    - [ ] Add tracking for in-progress fetches to `FetcherService` to prevent redundant operations.
    - [ ] Implement a method that waits for the fetch operation to complete and returns the result (success/failure, count).
- [ ] Task: Update `FeedServer.RefreshFeeds` handler
    - [ ] Update `cmd/feed-reader/handler.go` to use the enhanced fetch logic and return the detailed status in the RPC response.
- [ ] Task: Conductor - User Manual Verification 'Backend API Enhancement' (Protocol in workflow.md)

## Phase 2: Frontend Data Layer
- [ ] Task: Update TanStack Query mutation for `RefreshFeeds`
    - [ ] Ensure the mutation handles the new response format and updates the cache (e.g., invalidating feed queries) upon completion.
- [ ] Task: Implement fetching state management
    - [ ] Add a mechanism (e.g., a simple reactive set of IDs) to track which feeds are currently being fetched across the application.
- [ ] Task: Conductor - User Manual Verification 'Frontend Data Layer' (Protocol in workflow.md)

## Phase 3: Frontend UI Implementation
- [ ] Task: Implement row-level indicators in `FeedList`
    - [ ] Update `FeedList` components to display a loading spinner when a feed is being fetched.
    - [ ] Implement error display (icon + tooltip) when a fetch fails.
- [ ] Task: Add "Fetch Now" to Feed Context Menu
    - [ ] Integrate the fetch action into the existing "..." menu for individual feeds.
- [ ] Task: Implement Bulk "Fetch Selected" action
    - [ ] Add a "Fetch Selected" button to the bulk actions toolbar.
- [ ] Task: Conductor - User Manual Verification 'Frontend UI Implementation' (Protocol in workflow.md)
