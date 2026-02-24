# Implementation Plan: Fix Item Block Rules during Fetch Ingestion

## Phase 1: Research and Analysis
- [x] Task: Review the existing `FetcherService` logic for item ingestion.
    - [ ] Locate the `FetcherService` code responsible for saving fetched items to the database (likely in `cmd/feed-reader/fetcher_service.go`).
    - [ ] Analyze the current database schema and SQL queries for item block rule associations (see `sql/schema.sql` and `store/item_block_rules.go`).
    - [ ] Identify how block rules are retrieved and applied (e.g., `ListItemBlockRules` and `CreateItemBlockAssociation`).

## Phase 2: Red Phase - Write Failing Tests
- [x] Task: Create a reproduction test case for the missing block rule association during ingestion. 375c86a
    - [ ] Update `cmd/feed-reader/fetcher_service_test.go` or create a new test file to simulate a feed fetch where one of the items matches an existing block rule.
    - [ ] Assert that the item is correctly associated with the block rule in the database after the fetch.
    - [ ] Run the tests and confirm failure (`Red`).

## Phase 3: Green Phase - Implement Blocking Logic in FetcherService
- [x] Task: Implement the block rule matching and association logic in `FetcherService`. 375c86a
    - [ ] Update `FetcherService` to fetch active block rules from the store.
    - [ ] For each fetched item, iterate through the active rules and check for matches (keywords, domain, user/domain).
    - [ ] Ensure that when an item is saved to the database, the corresponding `ItemBlockAssociation` (or equivalent) is also created if a match is found.
    - [ ] Run the tests and confirm they now pass (`Green`).

## Phase 4: Refactor and Validation [checkpoint: 43647b2]
- [x] Task: Refactor the implementation for efficiency and clarity. d698990
    - [ ] Optimize the rule matching process (e.g., by caching rules or using a more efficient matching algorithm if many rules exist).
    - [ ] Ensure the implementation follows the project's code style and quality gates.
    - [ ] Verify that the item list API correctly excludes the newly ingested and blocked items.
    - [ ] Run all automated tests to ensure no regressions are introduced.

## Phase 5: Final Review and Checkpoint [checkpoint: 43647b2]
- [x] Task: Conductor - User Manual Verification 'Phase 5: Final Review' (Protocol in workflow.md) 43647b2
