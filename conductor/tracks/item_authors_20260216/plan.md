# Implementation Plan: Item Author Storage and Schema Upgrade

This plan outlines the steps to overhaul the item author storage mechanism, moving from a single-string format to a robust many-to-many relationship using a dedicated `authors` table.

## Phase 1: Schema and Data Access Layer [checkpoint: 7358dd4]
Goal: Define the new database schema and generate type-safe data access code using `sqlc`.

- [x] Task: Create a new SQL migration to add `authors` and `item_authors` tables. <sha:bf980eb>
    - [x] Add `authors` table with `id` (UUID), `name`, `email`, and `uri`.
    - [x] Add `item_authors` junction table with `item_id` and `author_id`.
    - [x] Remove obsolete author columns from `items` table.
- [x] Task: Update `sql/query.sql` with queries for the new tables. <sha:bf980eb>
    - [x] Add query to insert or retrieve (upsert/get) an author.
    - [x] Add query to link an item and an author in `item_authors`.
    - [x] Add query to list authors for a specific item.
- [x] Task: Run `make gen` (or equivalent) to update `sqlc` generated code. <sha:bf980eb>
- [x] Task: Conductor - User Manual Verification 'Schema and Data Access Layer' (Protocol in workflow.md) <sha:7358dd4>

## Phase 2: Protobuf and API Definitions [checkpoint: 97f7c82]
Goal: Update the communication contract to support multiple authors per item.

- [x] Task: Modify `proto/item/v1/item.proto` (or relevant proto file). <sha:19593ef>
    - [x] Define `Author` message with `name`, `email`, and `uri`.
    - [x] Update `Item` message to include a repeated field of `Author`.
- [x] Task: Run `buf generate` to update generated Go and TypeScript code. <sha:19593ef>
- [x] Task: Conductor - User Manual Verification 'Protobuf and API Definitions' (Protocol in workflow.md) <sha:c88048a>

## Phase 3: Backend Implementation (TDD) [checkpoint: 1446857]
Goal: Implement the logic to persist and retrieve authors, ensuring correctness through tests.

- [x] Task: Update `store/item_store.go` and related repository logic. <sha:611672a>
    - [x] Write tests in `store/item_store_test.go` for saving multiple authors.
    - [x] Implement `CreateItem` (or similar) to handle author persistence and linking.
    - [x] Write tests for retrieving items with their associated authors.
    - [x] Update retrieval queries to join with `authors` table.
- [x] Task: Update `cmd/feed-reader/fetcher.go` (or crawling service). <sha:611672a>
    - [x] Write tests in `cmd/feed-reader/fetcher_test.go` to verify `gofeed.Author` extraction.
    - [x] Update the fetcher to map `gofeed.Authors` to the new database structure.
- [x] Task: Update the Connect RPC handler in `cmd/feed-reader/item_handler.go`. <sha:611672a>
    - [x] Ensure the API response correctly populates the new `authors` field in the `Item` message.
- [x] Task: Conductor - User Manual Verification 'Backend Implementation' (Protocol in workflow.md) <sha:1446857>

## Phase 4: Frontend Integration (Optional/Minimal)
Goal: Ensure the frontend can at least handle the new data structure without breaking, and optionally display authors.

- [x] Task: Update frontend types and services to reflect the new `authors` array in items. <sha:e3cfb7d>
- [x] Task: (Optional) Update `ItemDetailModal.tsx` or item list components to display the authors. <sha:e3cfb7d>
- [~] Task: Conductor - User Manual Verification 'Frontend Integration' (Protocol in workflow.md)
