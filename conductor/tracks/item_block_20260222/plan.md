### Implementation Plan: Item Hiding (Block) Feature based on URL Parsing

**Phase 1: URL Parsing Rules** [checkpoint: b63a053]
- [x] Task: Create migration and table for `url_parsing_rules`. 34e6eda
- [x] Task: Update `sql/query.sql` and run `sqlc generate` for `url_parsing_rules` CRUD. f1f0121
- [x] Task: Add `AddURLParsingRule`, `DeleteURLParsingRule`, and `ListURLParsingRules` RPCs to `item.proto`. b97cde3
- [x] Task: Write TDD tests for `url_parsing_rules` repository logic. f1f0121
- [x] Task: Implement repository logic for `url_parsing_rules`. f1f0121
- [x] Task: Implement service-level handlers for URL parsing rules. 0de8505
- [ ] Task: Conductor - User Manual Verification 'Phase 1: URL Parsing Rules' (Protocol in workflow.md)

**Phase 2: Item Block Rules Management** [checkpoint: 84cb67a]
- [x] Task: Create migration and table for `item_block_rules`. 5503bf6
- [x] Task: Create table for `item_blocks` (blocked item associations). 5503bf6
- [x] Task: Update `sql/query.sql` and run `sqlc generate` for `item_block_rules` and `item_blocks` operations. 213ca67
- [x] Task: Add `AddItemBlockRules`, `DeleteItemBlockRule`, and `ListItemBlockRules` RPCs to `item.proto`. b9e4b5c
- [x] Task: Write TDD tests for `item_block_rules` repository logic. 213ca67
- [x] Task: Implement repository logic for `item_block_rules` (including bulk insertion). 213ca67
- [x] Task: Implement service-level handlers for item block rules. 8a6e074
- [ ] Task: Conductor - User Manual Verification 'Phase 2: Item Block Rules Management' (Protocol in workflow.md)

**Phase 3: Item Filtering (Block) Integration and Hooks**
- [x] Task: Implement a utility to extract user info from item URLs based on configured patterns in `url_parsing_rules`. 068b532
- [x] Task: Implement logic to scan and populate `item_blocks` when a new rule is added. e2f19bb
- [x] Task: Implement logic to check new items against active block rules during the fetch/store process. e76136c
- [x] Task: Update item repository logic to allow filtering by `item_blocks` in SQL queries. 9f18b54
- [ ] Task: Update `ItemService.ListItems` to exclude items present in `item_blocks`.
- [ ] Task: Conductor - User Manual Verification 'Phase 3: Item Filtering (Block) Integration and Hooks' (Protocol in workflow.md)
