# Implementation Plan - Fix SQLite Transaction Error

After migrating to `modernc.org/sqlite`, a "cannot start a transaction within a transaction" error occurs when saving items. This plan focuses on identifying the nested transaction cause and fixing it according to the TDD workflow.

## Phase 1: Investigation & Reproduction
- [ ] Task: Analyze the item saving logic and transaction management in the backend.
    - [ ] Search for transaction-related code in `store/` and `cmd/feed-reader/`.
    - [ ] Trace the execution path from feed fetching to item persistence.
- [ ] Task: Create a reproduction test case that triggers the "cannot start a transaction within a transaction" error.
    - [ ] Write a test in `store/` or `cmd/feed-reader/` that mimics the concurrent or sequential item saving that leads to the error.
    - [ ] Verify that this test fails with the reported error using `modernc.org/sqlite`.
- [ ] Task: Conductor - User Manual Verification 'Investigation & Reproduction' (Protocol in workflow.md)

## Phase 2: Fix Implementation
- [ ] Task: Refactor the transaction handling logic to prevent nested transactions.
    - [ ] Ensure that a transaction is not started if one is already active on the same connection/context.
    - [ ] Check if the application-level retry mechanism (`store/retry.go` or similar) is interacting poorly with the new driver's transaction state.
- [ ] Task: Verify the fix with the reproduction test case.
    - [ ] Run the reproduction test created in Phase 1 and confirm it passes.
- [ ] Task: Conductor - User Manual Verification 'Fix Implementation' (Protocol in workflow.md)

## Phase 3: Final Verification & Cleanup
- [ ] Task: Run all existing tests to ensure no regressions.
    - [ ] Execute `make test` or equivalent to run the full suite.
- [ ] Task: Verify the fix in the local environment.
    - [ ] Run the application locally, add/update feeds, and monitor logs for the transaction error.
- [ ] Task: Conductor - User Manual Verification 'Final Verification & Cleanup' (Protocol in workflow.md)
