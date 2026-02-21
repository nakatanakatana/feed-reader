# Implementation Plan - Block Management UI Update and Bulk Configuration Tests

## Phase 1: Test-Driven Refactoring for Bulk Configuration [checkpoint: 10dc8bf]
- [x] Task: Extract `parseBulkBlockingRules` logic from `blocking.tsx` to `frontend/src/lib/blocking-db.ts`. 2dd2436
- [x] Task: Write failing unit tests for `parseBulkBlockingRules` in `frontend/src/lib/blocking-db.test.ts` (TDD Red phase). 2dd2436
- [x] Task: Implement/Fix `parseBulkBlockingRules` to pass the tests (TDD Green phase). 2dd2436
- [x] Task: Update `blocking.tsx` to use the refactored `parseBulkBlockingRules` function. 2dd2436
- [x] Task: Conductor - User Manual Verification 'Phase 1' (Protocol in workflow.md) 10dc8bf

## Phase 2: UI Update - Blocking Rules Page [checkpoint: 4191b0b]
- [x] Task: Create `AddBlockingRuleForm` component in `frontend/src/components/AddBlockingRuleForm.tsx` (mimicking `AddFeedForm` style). 4cdf082
- [x] Task: Create `BulkImportBlockingRuleForm` component in `frontend/src/components/BulkImportBlockingRuleForm.tsx`. 4cdf082
- [x] Task: Update `frontend/src/routes/blocking.tsx` to use the new forms at the top of the page. 4cdf082
- [x] Task: Refactor the rule list in `blocking.tsx` to use a card-based layout instead of a table. 4cdf082
- [x] Task: Conductor - User Manual Verification 'Phase 2' (Protocol in workflow.md) 4191b0b

## Phase 3: UI Update - Parsing Rules Page [checkpoint: 07cd7ee]
- [x] Task: Create `AddParsingRuleForm` component in `frontend/src/components/AddParsingRuleForm.tsx`. 95e68b4
- [x] Task: Update `frontend/src/routes/parsing-rules.tsx` to use the new form at the top of the page. 3d27cb9
- [x] Task: Refactor the rule list in `parsing-rules.tsx` to use a card-based layout instead of a table. 3d27cb9
- [x] Task: Conductor - User Manual Verification 'Phase 3' (Protocol in workflow.md) 07cd7ee

## Phase 4: Final Polish & Verification
- [ ] Task: Run all frontend tests and ensure 100% pass rate.
- [ ] Task: Perform manual verification of mobile responsiveness for the new layouts.
- [ ] Task: Conductor - User Manual Verification 'Phase 4' (Protocol in workflow.md)
