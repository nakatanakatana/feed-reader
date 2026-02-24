# Track Specification: Fix Item Block Rules during Fetch Ingestion

## Overview
This track addresses a bug where items fetched *after* a block rule has been set are not correctly identified as blocked. These items should be associated with matching block rules during the ingestion process so that they are hidden from all retrieval APIs.

## Problem Statement
According to the `Product Definition`, item block rules should be pre-calculated during "item ingestion" and "rule creation." Currently, the mechanism to check and associate fetched items with active block rules during the save/upsert process in `FetcherService` is missing, causing newly ingested items to bypass the filtering logic.

## Functional Requirements
- **Integration Layer:** Implement the block rule checking mechanism within the `FetcherService` before the items are saved to the database.
- **Matching Logic:** For each fetched item, verify if it matches any existing `block-rules` based on:
    - Keywords in the Title or Snippets.
    - Source Domain.
    - Extracted User/Domain combinations from the URL (as defined by parsing rules).
- **Association:** If a match is found, ensure the item is correctly associated with the matching block rule in the database (e.g., via the `ItemBlockAssociation` or equivalent pre-calculation storage) during the save operation.
- **Persistence:** Items should still be saved to the database but must be marked as blocked via the pre-calculated association to ensure they are excluded from retrieval APIs.

## Non-Functional Requirements
- **Performance:** Ensure that the matching logic for block rules is efficient enough to handle large feed imports or high-frequency updates without significant overhead.
- **Testability:** Update `fetcher_service_test.go` and `item_handler_test.go` to include scenarios verifying that new items matching rules are correctly blocked.

## Acceptance Criteria
- [ ] New items matching a block rule are associated with that rule upon ingestion.
- [ ] Blocked items are successfully excluded from retrieval API responses (e.g., item list).
- [ ] Non-matching items remain visible and are unaffected by the change.
- [ ] Unit tests for `FetcherService` confirm the blocking behavior during ingestion.

## Out of Scope
- Re-applying block rules to items that are already stored in the database (retroactive blocking).
