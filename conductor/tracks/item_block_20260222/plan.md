### Implementation Plan: Item Hiding (Block) Feature based on URL Parsing

**Phase 1: URL Parsing Rules**
- [x] Task: Create migration and table for `url_parsing_rules`. 34e6eda
- [ ] Task: Update `sql/query.sql` and run `sqlc generate` for `url_parsing_rules` CRUD.
- [ ] Task: Add `AddURLParsingRule`, `DeleteURLParsingRule`, and `ListURLParsingRules` RPCs to `item.proto`.
- [ ] Task: Write TDD tests for `url_parsing_rules` repository logic.
- [ ] Task: Implement repository logic for `url_parsing_rules`.
- [ ] Task: Implement service-level handlers for URL parsing rules.
- [ ] Task: Conductor - User Manual Verification 'Phase 1: URL Parsing Rules' (Protocol in workflow.md)

**Phase 2: Item Block Rules Management**
- [ ] Task: Create migration and table for `item_block_rules`.
- [ ] Task: Create table for `item_blocks` (blocked item associations).
- [ ] Task: Update `sql/query.sql` and run `sqlc generate` for `item_block_rules` and `item_blocks` operations.
- [ ] Task: Add `AddItemBlockRules`, `DeleteItemBlockRule`, and `ListItemBlockRules` RPCs to `item.proto`.
- [ ] Task: Write TDD tests for `item_block_rules` repository logic.
- [ ] Task: Implement repository logic for `item_block_rules` (including bulk insertion).
- [ ] Task: Implement service-level handlers for item block rules.
- [ ] Task: Conductor - User Manual Verification 'Phase 2: Item Block Rules Management' (Protocol in workflow.md)

**Phase 3: Item Filtering (Block) Integration and Hooks**
- [ ] Task: Implement a utility to extract user info from item URLs based on configured patterns in `url_parsing_rules`.
- [ ] Task: Implement logic to scan and populate `item_blocks` when a new rule is added.
- [ ] Task: Implement logic to check new items against active block rules during the fetch/store process.
- [ ] Task: Update item repository logic to allow filtering by `item_blocks` in SQL queries.
- [ ] Task: Update `ItemService.ListItems` to exclude items present in `item_blocks`.
- [ ] Task: Conductor - User Manual Verification 'Phase 3: Item Filtering (Block) Integration and Hooks' (Protocol in workflow.md)
