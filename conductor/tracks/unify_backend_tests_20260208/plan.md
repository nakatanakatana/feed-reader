# Implementation Plan: Unify Backend Testing with gotest.tools

This plan outlines the steps to refactor the Go backend tests to use `gotest.tools` consistently across all packages.

## Phase 1: Setup and `store` Package Migration
Focus on the data layer (`store` package) which has extensive tests.

- [x] Task: Audit `store` package tests to identify specific refactoring targets (assertions, error checks, custom golden logic) (a64e1d1)
- [ ] Task: Refactor `store/feed_store_test.go` to use `assert` and `cmp`
- [ ] Task: Refactor `store/item_store_test.go` to use `assert` and `cmp`
- [ ] Task: Refactor other tests in `store/` (`author_test.go`, `tag_store.go`, etc.)
- [ ] Task: Migrate any custom golden file logic in `store/` to `gotest.tools/v3/golden`
- [ ] Task: Conductor - User Manual Verification 'Phase 1: store Package Migration' (Protocol in workflow.md)

## Phase 2: `cmd/feed-reader` Package Migration
Refactor the main application logic tests.

- [ ] Task: Audit `cmd/feed-reader/` tests for refactoring targets
- [ ] Task: Refactor `cmd/feed-reader/handler_test.go` and related HTTP handler tests
- [ ] Task: Refactor `cmd/feed-reader/fetcher_test.go` and `scheduler_test.go`
- [ ] Task: Refactor `cmd/feed-reader/opml_importer_test.go` and `converter_test.go`
- [ ] Task: Migrate existing golden tests in `cmd/feed-reader/` to `gotest.tools/v3/golden`
- [ ] Task: Conductor - User Manual Verification 'Phase 2: cmd/feed-reader Package Migration' (Protocol in workflow.md)

## Phase 3: Remaining Packages and Cleanup
Complete the migration for `sql/` and any other backend directories.

- [ ] Task: Refactor `sql/` package tests
- [ ] Task: Global search for any remaining redundant `if err != nil { t.Fatal(err) }` patterns in backend tests
- [ ] Task: Remove any unused custom testing utility functions replaced by `gotest.tools`
- [ ] Task: Verify overall test coverage hasn't regressed
- [ ] Task: Conductor - User Manual Verification 'Phase 3: Remaining Packages and Cleanup' (Protocol in workflow.md)
