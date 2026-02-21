# Implementation Plan - Block Management UI Update and Bulk Configuration Tests

## Phase 1: Test-Driven Refactoring for Bulk Configuration
- [ ] Task: Extract `parseBulkBlockingRules` logic from `blocking.tsx` to `frontend/src/lib/blocking-db.ts`.
- [ ] Task: Write failing unit tests for `parseBulkBlockingRules` in `frontend/src/lib/blocking-db.test.ts` (TDD Red phase).
- [ ] Task: Implement/Fix `parseBulkBlockingRules` to pass the tests (TDD Green phase).
- [ ] Task: Update `blocking.tsx` to use the refactored `parseBulkBlockingRules` function.
- [ ] Task: Conductor - User Manual Verification 'Phase 1' (Protocol in workflow.md)

## Phase 2: UI Update - Blocking Rules Page
- [ ] Task: Create `AddBlockingRuleForm` component in `frontend/src/components/AddBlockingRuleForm.tsx` (mimicking `AddFeedForm` style).
- [ ] Task: Create `BulkImportBlockingRuleForm` component in `frontend/src/components/BulkImportBlockingRuleForm.tsx`.
- [ ] Task: Update `frontend/src/routes/blocking.tsx` to use the new forms at the top of the page.
- [ ] Task: Refactor the rule list in `blocking.tsx` to use a card-based layout instead of a table.
- [ ] Task: Conductor - User Manual Verification 'Phase 2' (Protocol in workflow.md)

## Phase 3: UI Update - Parsing Rules Page
- [ ] Task: Create `AddParsingRuleForm` component in `frontend/src/components/AddParsingRuleForm.tsx`.
- [ ] Task: Update `frontend/src/routes/parsing-rules.tsx` to use the new form at the top of the page.
- [ ] Task: Refactor the rule list in `parsing-rules.tsx` to use a card-based layout instead of a table.
- [ ] Task: Conductor - User Manual Verification 'Phase 3' (Protocol in workflow.md)

## Phase 4: Final Polish & Verification
- [ ] Task: Run all frontend tests and ensure 100% pass rate.
- [ ] Task: Perform manual verification of mobile responsiveness for the new layouts.
- [ ] Task: Conductor - User Manual Verification 'Phase 4' (Protocol in workflow.md)
