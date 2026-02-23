# Specification: SQLite Foreign Key Support and Delete Cascade

## Overview
Currently, the SQLite database used in the Feed Reader project has foreign key constraints defined in the schema (with `ON DELETE CASCADE`), but they are not being enforced because foreign key support is disabled by default in SQLite. This track aims to enable foreign key support globally and verify that cascade deletions work as expected.

## Functional Requirements
- **Enable Foreign Keys Globally:** Configure the SQLite database connection to enable foreign key enforcement (`PRAGMA foreign_keys = ON`) for all connections, including those in the main application and tests.
- **Ensure Cascade Deletion:** All relationships defined with `ON DELETE CASCADE` in `sql/schema.sql` must be actively enforced.
    - `feeds` -> `feed_items`, `feed_tags`, `feed_fetcher`
    - `items` -> `feed_items`, `item_reads`, `item_blocks`
    - `tags` -> `feed_tags`
    - `item_block_rules` -> `item_blocks`

## Non-Functional Requirements
- **Consistency:** Ensure foreign key enforcement is consistent across production and testing environments.
- **Performance:** Maintain the high performance of database operations.

## Acceptance Criteria
- [ ] Deleting a `feeds` record automatically removes all related entries in `feed_items`, `feed_tags`, and `feed_fetcher`.
- [ ] Deleting an `items` record automatically removes all related entries in `feed_items`, `item_reads`, and `item_blocks`.
- [ ] Deleting a `tags` record automatically removes all related entries in `feed_tags`.
- [ ] Deleting an `item_block_rules` record automatically removes all related entries in `item_blocks`.
- [ ] Integration tests verify the above behaviors.

## Out of Scope
- Migrating existing orphaned data (if any exists).
- Implementing manual cleanup logic that would be redundant with cascade deletion.
