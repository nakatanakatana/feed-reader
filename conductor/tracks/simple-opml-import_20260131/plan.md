# Implementation Plan: Simple OPML Import and Feed Registration

This plan focuses on simplifying the OPML import process by making it synchronous, removing background job infrastructure for imports, and unifying feed registration to defer item fetching.

## Phase 1: Backend Cleanup and Redefinition
In this phase, we will remove the asynchronous job infrastructure and redefine the feed registration logic.

- [x] Task: Remove `ImportJob` and related storage logic in `store/` <!-- id: 83367b9 -->
- [ ] Task: Update `FeedStore.CreateFeed` (or equivalent) to only fetch metadata and not items
- [ ] Task: Remove background worker pool and write queue related to OPML imports if redundant
- [ ] Task: Conductor - User Manual Verification 'Phase 1: Backend Cleanup and Redefinition' (Protocol in workflow.md)

## Phase 2: Synchronous Import Implementation
Implement the synchronous logic for processing OPML files and returning results.

- [ ] Task: Implement synchronous OPML parsing and feed registration in `cmd/feed-reader/opml.go`
- [ ] Task: Update API handler to process OPML uploads synchronously and return a summary of successes/failures
- [ ] Task: Ensure deduplication logic remains robust during synchronous import
- [ ] Task: Conductor - User Manual Verification 'Phase 2: Synchronous Import Implementation' (Protocol in workflow.md)

## Phase 3: Frontend Update and Cleanup
Update the UI to handle the synchronous flow and remove obsolete job-tracking components.

- [ ] Task: Update `ImportOpmlModal.tsx` to handle the synchronous response and show a loading state
- [ ] Task: Display the summary of failed feed URLs after import completion
- [ ] Task: Remove job monitoring UI components and related state/queries
- [ ] Task: Conductor - User Manual Verification 'Phase 3: Frontend Update and Cleanup' (Protocol in workflow.md)

## Phase 4: Verification and Refinement
Final checks to ensure everything works as expected and coverage is maintained.

- [ ] Task: Verify that initial feed registration does not trigger immediate item fetch across all methods
- [ ] Task: Ensure background scheduler correctly picks up new feeds for their first item crawl
- [ ] Task: Run full test suite and ensure >80% coverage for changed areas
- [ ] Task: Conductor - User Manual Verification 'Phase 4: Verification and Refinement' (Protocol in workflow.md)
