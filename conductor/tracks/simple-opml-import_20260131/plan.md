# Implementation Plan: Simple OPML Import and Feed Registration

This plan focuses on simplifying the OPML import process by making it synchronous, removing background job infrastructure for imports, and unifying feed registration to defer item fetching.

## Phase 1: Backend Cleanup and Redefinition [checkpoint: 992ba7f]
In this phase, we will remove the asynchronous job infrastructure and redefine the feed registration logic.

- [x] Task: Remove `ImportJob` and related storage logic in `store/` <!-- id: 83367b9 -->
- [x] Task: Update `FeedStore.CreateFeed` (or equivalent) to only fetch metadata and not items <!-- id: 3567454 -->
- [x] Task: Remove background worker pool and write queue related to OPML imports if redundant <!-- id: 4b9f6f8 -->
- [x] Task: Conductor - User Manual Verification 'Phase 1: Backend Cleanup and Redefinition' (Protocol in workflow.md)

## Phase 2: Synchronous Import Implementation [checkpoint: e200361]
Implement the synchronous logic for processing OPML files and returning results.

- [x] Task: Implement synchronous OPML parsing and feed registration in `cmd/feed-reader/opml.go` <!-- id: 7a96901 -->
- [x] Task: Update API handler to process OPML uploads synchronously and return a summary of successes/failures <!-- id: 6479540 -->
- [x] Task: Ensure deduplication logic remains robust during synchronous import <!-- id: 7a96901 -->
- [x] Task: Conductor - User Manual Verification 'Phase 2: Synchronous Import Implementation' (Protocol in workflow.md)

## Phase 3: Frontend Update and Cleanup [checkpoint: 4ceefc5]
Update the UI to handle the synchronous flow and remove obsolete job-tracking components.

- [x] Task: Update `ImportOpmlModal.tsx` to handle the synchronous response and show a loading state <!-- id: existing -->
- [x] Task: Display the summary of failed feed URLs after import completion <!-- id: existing -->
- [x] Task: Remove job monitoring UI components and related state/queries <!-- id: existing -->
- [x] Task: Conductor - User Manual Verification 'Phase 3: Frontend Update and Cleanup' (Protocol in workflow.md)

## Phase 4: Verification and Refinement
Final checks to ensure everything works as expected and coverage is maintained.

- [x] Task: Verify that initial feed registration does not trigger immediate item fetch across all methods <!-- id: b94346c -->
- [x] Task: Ensure background scheduler correctly picks up new feeds for their first item crawl <!-- id: a0e7bc0 -->
- [~] Task: Run full test suite and ensure >80% coverage for changed areas
- [ ] Task: Conductor - User Manual Verification 'Phase 4: Verification and Refinement' (Protocol in workflow.md)
