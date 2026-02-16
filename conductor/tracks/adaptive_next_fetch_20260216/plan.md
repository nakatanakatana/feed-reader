# Implementation Plan: Adaptive Feed Fetching Scheduling

This plan implements an adaptive fetching mechanism that adjusts the `nextFetch` time based on the update frequency of feed items, as defined in `spec.md`.

## Phase 1: Logic Implementation & Unit Testing [checkpoint: 0751e5b]
Implement the core adaptive scheduling logic as a separate component and verify it with extensive unit tests.

- [x] Task: Create `AdaptiveScheduler` logic in `cmd/feed-reader/scheduler.go` d69ee9f
- [x] Task: Write unit tests for `AdaptiveScheduler` in `cmd/feed-reader/scheduler_test.go` d69ee9f
- [x] Task: Conductor - User Manual Verification 'Phase 1: Logic Implementation' (Protocol in workflow.md) 0751e5b

## Phase 2: Integration into FetcherService
Integrate the adaptive logic into the existing `FetcherService` and update the database interaction.

- [ ] Task: Refactor `FetcherService` to use `AdaptiveScheduler`
    - Update `fetchAndSaveSync` and `FetchAndSave` in `cmd/feed-reader/fetcher_service.go`.
    - Modify the logic that calculates `nextFetch` to use the new scheduler.
- [ ] Task: Update `FetcherService` tests
    - Update `cmd/feed-reader/fetcher_service_test.go` to verify that `nextFetch` is now calculated adaptively rather than using a fixed interval.
- [ ] Task: Conductor - User Manual Verification 'Phase 2: Integration' (Protocol in workflow.md)

## Phase 3: Final Verification & Clean up
Verify the end-to-end behavior and ensure all quality gates are met.

- [ ] Task: Run full test suite and verify coverage
    - Ensure >80% coverage for new logic.
- [ ] Task: Final code review and linting
    - Run `make check` or equivalent linting tools.
- [ ] Task: Conductor - User Manual Verification 'Phase 3: Final Verification' (Protocol in workflow.md)
