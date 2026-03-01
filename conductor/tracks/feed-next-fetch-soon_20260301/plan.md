# Implementation Plan: Fix Next Fetch display on Feed List

## Phase 1: Research and Test Reproduction [checkpoint: 4c56019]
- [x] Task: Research existing `FeedList` tests and identify the correct location for reproduction. [319c2b1]
- [x] Task: Create a failing test case in `frontend/src/components/FeedList.test.tsx` where a feed has a `nextFetch` in the past. [319c2b1]
- [x] Task: Conductor - User Manual Verification 'Phase 1' (Protocol in workflow.md) [4c56019]

## Phase 2: Implementation and Verification
- [ ] Task: Update `frontend/src/components/FeedList.tsx` to display "Soon" when `nextFetch` is in the past.
- [ ] Task: Verify that the failing test now passes and all other `FeedList` tests pass.
- [ ] Task: Conductor - User Manual Verification 'Phase 2' (Protocol in workflow.md)
