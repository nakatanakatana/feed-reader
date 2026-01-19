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

- [ ] Task: Create a new SQL migration or update `sql/schema.sql` to add `item_saves` table
    - [ ] Add `item_saves` table (item_id, is_saved, saved_at, etc.)
- [ ] Task: Update `sql/query.sql` with queries for `items`
    - [ ] Query for `GetItem` (joining status tables)
    - [ ] Query for `ListItems` with filters (feed_id, is_read, is_saved) and sorting
    - [ ] Queries for updating `item_reads` and `item_saves`
- [ ] Task: Implement TDD for `store` layer
    - [ ] Write tests for item-related store methods in `store/item_store_test.go`
    - [ ] Implement methods in `store/item_store.go` (or update existing store)
- [ ] Task: Conductor - User Manual Verification 'Phase 2: Database Schema & Store Layer' (Protocol in workflow.md)

## Phase 3: Backend Service Implementation
Implement the Connect RPC handlers and integrate them into the application.

- [ ] Task: Implement TDD for `ItemService` handlers
    - [ ] Write tests for `GetItem`, `ListItems`, and `UpdateItemStatus` in `cmd/feed-reader/item_handler_test.go`
    - [ ] Implement handlers in `cmd/feed-reader/item_handler.go`
- [ ] Task: Register `ItemService` in the application router
    - [ ] Update `cmd/feed-reader/main.go` or routing logic to include the new service
- [ ] Task: Conductor - User Manual Verification 'Phase 3: Backend Service Implementation' (Protocol in workflow.md)
