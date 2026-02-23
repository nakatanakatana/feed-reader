# Implementation Plan: TanStack DB Migration for Block Rules

## Phase 1: Foundation - block-db.ts [checkpoint: 769041b]
**Goal:** Create the centralized state management for `URLParsingRule` and `ItemBlockRule` using `TanStack DB`.

- [x] Task: Write Tests for block-db.ts c812b1d
    - Create `frontend/src/lib/block-db.test.ts`.
    - Mock `ItemService` and `transport`.
    - Define tests for `urlParsingRules` and `itemBlockRules` collections (fetch, insert, delete).
- [x] Task: Implement block-db.ts c812b1d
    - Create `frontend/src/lib/block-db.ts`.
    - Define interfaces for `URLParsingRule` and `ItemBlockRule`.
    - Implement `urlParsingRules` collection.
    - Implement `itemBlockRules` collection.
    - Implement helper functions: `urlParsingRuleInsert`, `urlParsingRuleDelete`, `itemBlockRuleInsert`, `itemBlockRuleDelete`.
- [ ] Task: Conductor - User Manual Verification 'Phase 1: Foundation' (Protocol in workflow.md)

## Phase 2: UI Migration - Block Rules [checkpoint: e721cb3]
**Goal:** Update the Block Rules management page to use the new collection.

- [x] Task: Update Block Rules Route 32325d9
    - Modify `frontend/src/routes/block-rules.tsx`.
    - Replace `createQuery` for `block-rules` with usage of `itemBlockRules` collection.
    - Replace `createMutation` calls with helper functions from `block-db.ts`.
- [x] Task: Verify Block Rules Tests 32325d9
    - Run `frontend/src/routes_test/block_rules.test.tsx` and ensure all tests pass.
- [ ] Task: Conductor - User Manual Verification 'Phase 2: UI Migration - Block Rules' (Protocol in workflow.md)

## Phase 3: UI Migration - URL Rules [checkpoint: 3e4f03d]
**Goal:** Update the URL Parsing Rules management page to use the new collection.

- [x] Task: Update URL Rules Route 58f370e
    - Modify `frontend/src/routes/url-rules.tsx`.
    - Replace `createQuery` for `url-rules` with usage of `urlParsingRules` collection.
    - Replace `createMutation` calls with helper functions from `block-db.ts`.
- [x] Task: Verify URL Rules Tests 58f370e
    - Run `frontend/src/routes_test/url_rules.test.tsx` and ensure all tests pass.
- [ ] Task: Conductor - User Manual Verification 'Phase 3: UI Migration - URL Rules' (Protocol in workflow.md)

## Phase 4: UI Migration - Item Detail Modal
**Goal:** Update the Item Detail Modal to use the new collections for blocking actions.

- [x] Task: Update Item Detail Modal 78517a9
    - Modify `frontend/src/components/ItemDetailModal.tsx`.
    - Replace direct `TanStack Query` usage for block rules with helpers from `block-db.ts`.
- [x] Task: Verify Item Detail Modal Tests 78517a9
    - Run related tests (e.g., `frontend/src/components/ItemDetailModal.KebabMenu.test.tsx`) and ensure they pass.
- [ ] Task: Conductor - User Manual Verification 'Phase 4: UI Migration - Item Detail Modal' (Protocol in workflow.md)

## Phase 5: Final Cleanup
**Goal:** Remove redundant code and ensure system stability.

- [ ] Task: Clean up lib/api/block-rules.ts
    - Check if `frontend/src/lib/api/block-rules.ts` is still needed. If not, remove it.
- [ ] Task: Final Integration Check
    - Run all frontend tests: `CI=true npm test`.
- [ ] Task: Conductor - User Manual Verification 'Phase 5: Final Cleanup' (Protocol in workflow.md)
