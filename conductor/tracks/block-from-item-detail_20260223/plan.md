# Implementation Plan: Block from Item Detail Modal

## Phase 1: Research and Logic Implementation (TDD)
- [x] Task: Research the existing `URLParser` in the backend and identify how to use `url_parsing_rules` in the frontend. (db374cd)
- [ ] Task: Create `frontend/src/lib/url-parser.ts` to mirror the backend's extraction logic.
- [ ] Task: Write failing unit tests for `url-parser.ts` in `frontend/src/lib/url-parser.test.ts`.
- [ ] Task: Implement `URLParser` logic to pass the tests.
- [ ] Task: Refactor the code and ensure all edge cases (e.g., malformed URLs) are handled.
- [ ] Task: Conductor - User Manual Verification 'Phase 1: Logic' (Protocol in workflow.md)

## Phase 2: UI Component and Mutation
- [ ] Task: Add a query/mutation to call `AddItemBlockRules` and `ListURLParsingRules` from the frontend (moving shared logic to a library file if necessary).
- [ ] Task: Integrate the `KebabMenu` component into the `ItemDetailModal` header.
- [ ] Task: Implement the "Block" actions within `ItemDetailModal`, utilizing the `URLParser` and the new mutation.
- [ ] Task: Add a notification mechanism to provide success feedback after a rule is successfully added.
- [ ] Task: Write integration tests for `ItemDetailModal` to verify the "Block" menu appears and triggers the mutation correctly.
- [ ] Task: Conductor - User Manual Verification 'Phase 2: UI & Mutation' (Protocol in workflow.md)

## Phase 3: Final Integration and Refinement
- [ ] Task: Verify the end-to-end flow on both desktop and mobile viewports.
- [ ] Task: Perform a final review to ensure the implementation follows the project's code style guides.
- [ ] Task: Conductor - User Manual Verification 'Phase 3: Final Verification' (Protocol in workflow.md)
