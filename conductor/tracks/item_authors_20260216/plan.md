# Implementation Plan: Item Author Storage and Schema Upgrade

This plan outlines the steps to overhaul the item author storage mechanism, moving from a single-string format to a robust many-to-many relationship using a dedicated `authors` table.

## Phase 1: Schema and Data Access Layer
Goal: Define the new database schema and generate type-safe data access code using `sqlc`.

- [ ] Task: Create a new SQL migration to add `authors` and `item_authors` tables.
    - [ ] Add `authors` table with `id` (UUID), `name`, `email`, and `uri`.
    - [ ] Add `item_authors` junction table with `item_id` and `author_id`.
    - [ ] Remove obsolete author columns from `items` table.
- [ ] Task: Update `sql/query.sql` with queries for the new tables.
    - [ ] Add query to insert or retrieve (upsert/get) an author.
    - [ ] Add query to link an item and an author in `item_authors`.
    - [ ] Add query to list authors for a specific item.
- [ ] Task: Run `make gen` (or equivalent) to update `sqlc` generated code.
- [ ] Task: Conductor - User Manual Verification 'Schema and Data Access Layer' (Protocol in workflow.md)

## Phase 2: Protobuf and API Definitions
Goal: Update the communication contract to support multiple authors per item.

- [ ] Task: Modify `proto/item/v1/item.proto` (or relevant proto file).
    - [ ] Define `Author` message with `name`, `email`, and `uri`.
    - [ ] Update `Item` message to include a repeated field of `Author`.
- [ ] Task: Run `buf generate` to update generated Go and TypeScript code.
- [ ] Task: Conductor - User Manual Verification 'Protobuf and API Definitions' (Protocol in workflow.md)

## Phase 3: Backend Implementation (TDD)
Goal: Implement the logic to persist and retrieve authors, ensuring correctness through tests.

- [ ] Task: Update `store/item_store.go` and related repository logic.
    - [ ] Write tests in `store/item_store_test.go` for saving multiple authors.
    - [ ] Implement `CreateItem` (or similar) to handle author persistence and linking.
    - [ ] Write tests for retrieving items with their associated authors.
    - [ ] Update retrieval queries to join with `authors` table.
- [ ] Task: Update `cmd/feed-reader/fetcher.go` (or crawling service).
    - [ ] Write tests in `cmd/feed-reader/fetcher_test.go` to verify `gofeed.Author` extraction.
    - [ ] Update the fetcher to map `gofeed.Authors` to the new database structure.
- [ ] Task: Update the Connect RPC handler in `cmd/feed-reader/item_handler.go`.
    - [ ] Ensure the API response correctly populates the new `authors` field in the `Item` message.
- [ ] Task: Conductor - User Manual Verification 'Backend Implementation' (Protocol in workflow.md)

## Phase 4: Frontend Integration (Optional/Minimal)
Goal: Ensure the frontend can at least handle the new data structure without breaking, and optionally display authors.

- [ ] Task: Update frontend types and services to reflect the new `authors` array in items.
- [ ] Task: (Optional) Update `ItemDetailModal.tsx` or item list components to display the authors.
- [ ] Task: Conductor - User Manual Verification 'Frontend Integration' (Protocol in workflow.md)
