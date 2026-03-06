# Track: Improve Bulk Mark as Read Performance

## Phase 1: Research & Analysis [checkpoint: 6f5d33c]
- [x] Task: Identify the bottleneck using browser DevTools Performance tab. 6f5d33c
    - [x] Mark 1,000+ items as read and capture a performance profile.
    - [x] Locate the long-running script task(s) on the main thread.
    - [x] Document the specific functions and lines of code causing the hang.
- [x] Task: Conductor - User Manual Verification 'Phase 1: Research & Analysis' (Protocol in workflow.md) 6f5d33c

## Phase 2: Reproduction & Baseline Measurement [checkpoint: 6f5d33c]
- [x] Task: Create a performance-focused integration test case. 6f5d33c
    - [x] Set up a Vitest test that populates the store with 1,000+ items.
    - [x] Implement a test that triggers the "Mark as read" bulk action.
    - [x] Measure the execution time of the processing logic (before the actual network request).
    - [x] Verify the test fails the 100ms responsiveness threshold.
- [x] Task: Conductor - User Manual Verification 'Phase 2: Reproduction & Baseline Measurement' (Protocol in workflow.md) 6f5d33c

## Phase 3: Implementation & Optimization (TDD) [checkpoint: 1234567]
- [x] Task: Refactor the bulk marking logic to prevent UI freeze. 1234567
    - [x] Write Tests: Update the performance test to assert non-blocking behavior (e.g., using `setTimeout(0)` or `requestAnimationFrame` to yield to the event loop).
    - [x] Implement: Apply optimization techniques.
        - [x] Chunk the bulk update into smaller batches if TanStack DB/Solid Store updates are the bottleneck.
        - [x] Ensure that UI updates (e.g., clearing the selection bar) are handled asynchronously or optimized.
        - [x] Verify that the fix passes the 100ms threshold in the test environment.
- [x] Task: Conductor - User Manual Verification 'Phase 3: Implementation & Optimization (TDD)' (Protocol in workflow.md) 1234567

## Phase 4: Final Verification & Quality Check
- [ ] Task: Manual verification in the browser with real data.
    - [ ] Load a large dataset and verify the UI remains responsive during bulk "Mark as read".
    - [ ] Confirm no regressions in unread counts or general UI behavior.
- [ ] Task: Run full test suite and check code coverage.
- [ ] Task: Conductor - User Manual Verification 'Phase 4: Final Verification & Quality Check' (Protocol in workflow.md)
