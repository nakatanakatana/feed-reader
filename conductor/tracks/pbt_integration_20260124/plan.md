# Implementation Plan - Introduction of Property-Based Testing (PBT)

This plan outlines the steps to introduce Property-Based Testing to both backend and frontend, including library installation, analysis, and implementation of test cases for critical logic.

## Phase 1: Backend Infrastructure & Initial PBT
Focus on setting up the Go PBT environment and applying it to core backend logic.

- [x] Task: Install `pgregory.net/rapid` and verify setup (b17e7c7)
    - [x] Run `go get pgregory.net/rapid`
    - [x] Create a dummy PBT test to ensure it runs with `go test ./...`
- [ ] Task: Implement PBT for Scheduling Logic (`cmd/feed-reader/scheduler.go`)
    - [ ] Write failing PBT tests in `cmd/feed-reader/scheduler_test.go` to verify jitter and boundary calculations
    - [ ] Ensure the implementation passes the property checks
- [ ] Task: Implement PBT for Feed Normalization (`cmd/feed-reader/fetcher.go`)
    - [ ] Write failing PBT tests in `cmd/feed-reader/fetcher_test.go` to verify `gofeed.Item` to `store.CreateItemParams` mapping
    - [ ] Ensure the implementation handles diverse (generated) inputs correctly
- [ ] Task: Conductor - User Manual Verification 'Phase 1: Backend Infrastructure & Initial PBT' (Protocol in workflow.md)

## Phase 2: Frontend Infrastructure & Initial PBT
Focus on setting up the TypeScript PBT environment and applying it to core frontend logic.

- [ ] Task: Install `fast-check` and verify setup
    - [ ] Run `npm install -D fast-check` in the frontend directory
    - [ ] Create a dummy PBT test to ensure it runs with `vitest`
- [ ] Task: Implement PBT for Item Filtering & Sorting (`frontend/src/lib/item-query.ts`)
    - [ ] Write failing PBT tests in `frontend/src/lib/item-query.test.ts`
    - [ ] Verify invariants: sorted order and correct filtering for any generated input
- [ ] Task: Implement PBT for URL/String Utilities (if applicable)
    - [ ] Identify or create utility functions for string normalization
    - [ ] Write PBT tests to ensure resilience against malformed inputs
- [ ] Task: Conductor - User Manual Verification 'Phase 2: Frontend Infrastructure & Initial PBT' (Protocol in workflow.md)

## Phase 3: Final Integration & Coverage
Ensure all PBT cases are integrated into the CI and meet quality standards.

- [ ] Task: Verify overall test coverage and CI integration
    - [ ] Run `go test -cover` and ensure backend coverage >80%
    - [ ] Run frontend coverage report and ensure coverage >80%
- [ ] Task: Document PBT usage in the project (optional/brief)
- [ ] Task: Conductor - User Manual Verification 'Phase 3: Final Integration & Coverage' (Protocol in workflow.md)
