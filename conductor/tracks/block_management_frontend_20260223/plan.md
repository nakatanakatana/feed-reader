# Implementation Plan: Block Management Frontend

## Phase 1: Routing & Navigation [checkpoint: 16c878e]
- [x] Task: Create new routes for URL Rules and Block Rules in TanStack Router. ead0b52
    - [x] Create `frontend/src/routes/url-rules.tsx`.
    - [x] Create `frontend/src/routes/block-rules.tsx`.
- [x] Task: Add navigation links to the main header in `frontend/src/routes/__root.tsx`. ead0b52
- [x] Task: Conductor - User Manual Verification 'Phase 1: Routing & Navigation' (Protocol in workflow.md) 16c878e
- [ ] Task: Conductor - User Manual Verification 'Phase 1: Routing & Navigation' (Protocol in workflow.md)

## Phase 2: URL Rules Management Page [checkpoint: 1672321]
- [x] Task: Implement `AddURLParsingRule` form and rule list in `frontend/src/routes/url-rules.tsx`. f98aff5, d184603
    - [x] Write failing tests for rule fetching and adding using MSW and Vitest.
    - [x] Implement UI for the input form (domain, rule_type, pattern).
    - [x] Implement UI for the rule list cards.
    - [x] Connect with `ItemService.AddURLParsingRule`, `ListURLParsingRules`, and `DeleteURLParsingRule` using TanStack Query.
- [x] Task: Conductor - User Manual Verification 'Phase 2: URL Rules Management Page' (Protocol in workflow.md) 1672321

## Phase 3: Block Rules Management Page
- [x] Task: Implement `ItemBlockRule` form and rule list in `frontend/src/routes/block-rules.tsx`. 682d26e
    - [x] Write failing tests for rule fetching and adding using MSW and Vitest.
    - [x] Implement UI for the input form (rule_type, value, domain).
    - [x] Implement UI for the rule list cards.
    - [x] Connect with `ItemService.AddItemBlockRules`, `ListItemBlockRules`, and `DeleteItemBlockRule` using TanStack Query.
- [ ] Task: Conductor - User Manual Verification 'Phase 3: Block Rules Management Page' (Protocol in workflow.md)

## Phase 4: Final Verification & Polish
- [ ] Task: Ensure responsive design and mobile-friendliness.
- [ ] Task: Verify that coverage meets the >80% requirement.
- [ ] Task: Conductor - User Manual Verification 'Phase 4: Final Verification & Polish' (Protocol in workflow.md)
