# Implementation Plan: Fix Bulk Domain Block Registration

## Phase 1: Analysis & Reproduction [checkpoint: ed1ef71]
- [x] Task: Research the frontend bulk registration data mapping logic. ed1ef71
- [x] Task: Research the backend CSV parsing and bulk rule creation logic. ed1ef71
- [x] Task: Create a failing backend unit test in `cmd/feed-reader/item_block_rules_test.go` (or similar) to reproduce the empty domain issue. ed1ef71
- [x] Task: Create a failing frontend unit test in `frontend/src/components/BulkAddBlockRulesModal.test.tsx` (or similar) to reproduce the incorrect data mapping. ed1ef71
- [x] Task: Conductor - User Manual Verification 'Analysis & Reproduction' (Protocol in workflow.md) ed1ef71

## Phase 2: Implementation & Fix [checkpoint: 2573d33]
- [x] Task: Fix the backend bulk registration handler to ensure the `domain` column is correctly populated for `domain` type rules. 2573d33
- [x] Task: Fix the frontend bulk registration logic to correctly map the `domain` field when `type` is `domain`. 2573d33
- [x] Task: Verify that both frontend and backend tests now pass (Green Phase). 2573d33
- [x] Task: Ensure code coverage for the fix is >80%. 2573d33
- [x] Task: Conductor - User Manual Verification 'Implementation & Fix' (Protocol in workflow.md) 2573d33

## Phase 3: Final Verification & Cleanup
- [ ] Task: Perform manual verification by registering domain rules via the UI (CSV upload and manual text).
- [ ] Task: Verify that existing keyword and user block rules are unaffected.
- [ ] Task: Conductor - User Manual Verification 'Final Verification & Cleanup' (Protocol in workflow.md)
