# Implementation Plan: Item Management API (item/v1)

## Phase 1: API Definition & Code Generation
Define the Connect RPC service for item management and generate the Go source code.

- [x] Task: Create `proto/item/v1/item.proto` with `ItemService` definition beeb4de
    - [x] Define `Item` message matching the spec
    - [x] Define `GetItem`, `ListItems`, and `UpdateItemStatus` RPCs
- [x] Task: Generate Go code from Protobuf using `buf generate` 02d19c9
- [x] Task: Conductor - User Manual Verification 'Phase 1: API Definition & Code Generation' (Protocol in workflow.md) [checkpoint: 2899e45]

## Phase 2: Database Schema & Store Layer
Update the database schema to support article statuses and implement the store layer.

- [x] Task: Create a new SQL migration or update `sql/schema.sql` to add `item_saves` table ba3a70c
    - [x] Add `item_saves` table (item_id, is_saved, saved_at, etc.)
- [x] Task: Update `sql/query.sql` with queries for `items` 34f5e24
    - [x] Query for `GetItem` (joining status tables)
    - [x] Query for `ListItems` with filters (feed_id, is_read, is_saved) and sorting
    - [x] Queries for updating `item_reads` and `item_saves`
- [x] Task: Implement TDD for `store` layer 4ed8eef
    - [x] Write tests for item-related store methods in `store/item_store_test.go`
    - [x] Implement methods in `store/item_store.go` (or update existing store)
- [x] Task: Conductor - User Manual Verification 'Phase 2: Database Schema & Store Layer' (Protocol in workflow.md) [checkpoint: 00e8645]

## Phase 3: Backend Service Implementation
Implement the Connect RPC handlers and integrate them into the application.

- [x] Task: Implement TDD for `ItemService` handlers 98010b6
    - [x] Write tests for `GetItem`, `ListItems`, and `UpdateItemStatus` in `cmd/feed-reader/item_handler_test.go`
    - [x] Implement handlers in `cmd/feed-reader/item_handler.go`
- [x] Task: Register `ItemService` in the application router 862c0b4
    - [x] Update `cmd/feed-reader/main.go` or routing logic to include the new service
- [ ] Task: Conductor - User Manual Verification 'Phase 3: Backend Service Implementation' (Protocol in workflow.md)
