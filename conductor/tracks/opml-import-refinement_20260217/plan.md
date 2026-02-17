# Implementation Plan: OPML Import Optimization Refinement and Bug Fixes

This plan addresses feedback from PR #213 to ensure correctness and maintainability of the optimized OPML import.

## Phase 1: Bug Fixes and Cleanup
Goal: Fix the tag ID bug and remove unused code.

- [x] Task: Remove unused `BulkCreateFeeds`, `BulkCreateTags`, and `BulkCreateFeedTags` from `store` package. [5d79fcf]
- [x] Task: Update `CreateTag` SQL to use `ON CONFLICT DO UPDATE` or handle existing tags correctly in `ImportSync`. [7731c10]
- [x] Task: Fix the tag ID mismatch bug in `ImportSync` by retrieving the actual tag ID for existing tags. [953f4d3]
- [x] Task: Conductor - User Manual Verification 'Phase 1: Bug Fixes and Cleanup' (Protocol in workflow.md) [checkpoint: 953f4d3]

## Phase 2: Refinements and Reliability
Goal: Improve parallel processing and benchmarking.

- [x] Task: Implement application-level deduplication for parallel fetches using `sync.Map`. [dee93cb]
- [x] Task: Refactor `BenchmarkOPMLImporter_ImportSync` to avoid mutating `importer.store`. [dee93cb]
- [x] Task: Conductor - User Manual Verification 'Phase 2: Refinements and Reliability' (Protocol in workflow.md) [checkpoint: dee93cb]

## Phase 3: Enhanced Testing
Goal: Verify corner cases and concurrency issues.

- [x] Task: Add test case for concurrent tag handling in `TestOPMLImporter_ImportSync_Parallel`. [c1a892e]
- [x] Task: Add performance assertion to `TestOPMLImporter_ImportSync_Parallel`. [c1a892e]
- [x] Task: Add test for duplicate tag names in bulk operations (if still applicable). [c1a892e]
- [x] Task: Conductor - User Manual Verification 'Phase 3: Enhanced Testing' (Protocol in workflow.md) [checkpoint: c1a892e]
