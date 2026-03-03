# Implementation Plan: `list_item_read_api_20260303`

## Phase 1: API Definition & Code Generation
- [x] Task: Update `proto/item/v1/item.proto` to include `ListItemRead` RPC and messages. 901f257
- [~] Task: Run `buf generate` to generate Go and TypeScript code.
- [ ] Task: Conductor - User Manual Verification 'Phase 1: API Definition & Code Generation' (Protocol in workflow.md)

## Phase 2: Database Layer Implementation
- [ ] Task: Add `ListItemRead` query to `store/query.sql` to fetch `item_reads` filtered by `updated_at`.
- [ ] Task: Run `sqlc generate` to update generated database logic.
- [ ] Task: Add `ListItemRead` wrapper to `store/item_store.go`.
- [ ] Task: Write unit tests for `ListItemRead` in `store/item_store_test.go`.
- [ ] Task: Conductor - User Manual Verification 'Phase 2: Database Layer Implementation' (Protocol in workflow.md)

## Phase 3: Service Layer Implementation
- [ ] Task: Implement `ListItemRead` RPC handler in `cmd/feed-reader/item_handler.go`.
- [ ] Task: Write unit tests for `ListItemRead` RPC in `cmd/feed-reader/item_handler_test.go`.
- [ ] Task: Conductor - User Manual Verification 'Phase 3: Service Layer Implementation' (Protocol in workflow.md)

## Phase 4: Final Integration & Verification
- [ ] Task: Perform end-to-end verification of `ListItemRead` functionality with and without `updated_after` filter.
- [ ] Task: Conductor - User Manual Verification 'Phase 4: Final Integration & Verification' (Protocol in workflow.md)
