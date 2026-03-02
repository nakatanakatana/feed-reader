# Implementation Plan: sync_item_reads_20260302

## Phase 1: Backend Implementation (API & Store) [checkpoint: e15f991]
Establish the `ListItemReads` RPC and the underlying database logic to fetch incremental updates of read statuses.

- [x] Task: Update `proto/item/v1/item.proto` to include `ListItemReads` RPC and associated message types. [0a33ded]
- [x] Task: Generate Go and TypeScript code from Protobuf using `buf generate`. [6ed32d2]
- [x] Task: Add an index on `item_reads.updated_at` in `sql/schema.sql` and `sql/query.sql` (if needed) to ensure performance. [de1171b]
- [x] Task: Add `ListItemReads` query to `sql/query.sql` to fetch read statuses filtered by `updated_at`. [0748510]
- [x] Task: Generate Go code for queries using `sqlc`. [18fdf3d]
- [x] Task: Implement `ListItemReads` in `cmd/feed-reader/item_handler.go`. [3b9421c]
- [x] Task: Write unit tests for `ListItemReads` in `cmd/feed-reader/item_handler_test.go` and `store/item_store_test.go`. [4e9d59d]
- [x] Task: Conductor - User Manual Verification 'Backend Implementation' (Protocol in workflow.md) [e15f991]

## Phase 2: Frontend Implementation (Polling & State Sync)
Implement the background polling logic and integrate the received read status updates into the local TanStack DB.

- [x] Task: Implement `syncItemReads` function in `frontend/src/lib/item-db.ts` to call the new API and update the local collection in TanStack DB. [f8110bb]
- [x] Task: Set up a periodic background timer (1 minute) to trigger `syncItemReads`. [f8110bb]
- [x] Task: Manage the sync cursor (timestamp) correctly, initializing it from the initial item fetch and updating it after each successful sync. [f8110bb]
- [x] Task: Update the "Refetch" button logic to also trigger an immediate read status sync. [f8110bb]
- [x] Task: Write unit tests for the synchronization logic in `frontend/src/lib/item-db.test.ts`. [f8110bb]
- [x] Task: Conductor - User Manual Verification 'Frontend Implementation' (Protocol in workflow.md) [539dbff]

## Phase 3: Final Integration & E2E Verification [checkpoint: e044bdf]
Verify that changes are correctly reflected across multiple browser instances.

- [x] Task: Verify end-to-end synchronization between two browser windows. [e044bdf]
- [x] Task: Ensure "unread" status synchronization also works as expected. [e044bdf]
- [x] Task: Conductor - User Manual Verification 'Final Integration' (Protocol in workflow.md) [3c03f21]
