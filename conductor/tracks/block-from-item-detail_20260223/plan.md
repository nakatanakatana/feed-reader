# Implementation Plan: Block from Item Detail Modal

## Phase 1: Research and Logic Implementation (TDD)
- [x] Task: Research the existing `URLParser` in the backend and identify how to use `url_parsing_rules` in the frontend. (db374cd)
- [x] Task: Create `frontend/src/lib/url-parser.ts` to mirror the backend's extraction logic. (8230820)
- [x] Task: Write failing unit tests for `url-parser.ts` in `frontend/src/lib/url-parser.test.ts`. (8230820)
- [x] Task: Implement `URLParser` logic to pass the tests. (8230820)
- [x] Task: Refactor the code and ensure all edge cases (e.g., malformed URLs) are handled. (8230820)
- [~] Task: Conductor - User Manual Verification 'Phase 1: Logic' (Protocol in workflow.md)

## Phase 2: UI Component and Mutation
- [x] Task: Add a query/mutation to call `AddItemBlockRules` and `ListURLParsingRules` from the frontend (moving shared logic to a library file if necessary). (08c2583)
- [x] Task: Integrate the `KebabMenu` component into the `ItemDetailModal` header. (74f08e1)
- [x] Task: Implement the "Block" actions within `ItemDetailModal`, utilizing the `URLParser` and the new mutation. (6b890f2)
- [x] Task: Add a notification mechanism to provide success feedback after a rule is successfully added. (cc8aa9b)
- [ ] Task: Write integration tests for `ItemDetailModal` to verify the "Block" menu appears and triggers the mutation correctly.
- [ ] Task: Conductor - User Manual Verification 'Phase 2: UI & Mutation' (Protocol in workflow.md)

## Phase 3: Final Integration and Refinement
- [ ] Task: Verify the end-to-end flow on both desktop and mobile viewports.
- [ ] Task: Perform a final review to ensure the implementation follows the project's code style guides.
- [ ] Task: Conductor - User Manual Verification 'Phase 3: Final Verification' (Protocol in workflow.md)
