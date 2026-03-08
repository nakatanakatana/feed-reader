# Implementation Plan: API Simplification and Standardization

## Phase 1: Protocol Buffer Definitions [checkpoint: b65602f]
- [x] Task: Update `proto/feed/v1/feed.proto` (Remove unused fields, update to Timestamp, merge message types, rename next_fetch). 8eadfaf
- [x] Task: Update `proto/tag/v1/tag.proto` (Update to Timestamp, merge message types). 8eadfaf
- [x] Task: Update `proto/item/v1/item.proto` (Update to Timestamp, merge message types, update pagination params). 8eadfaf
- [x] Task: Run `buf generate` to generate Go and TypeScript code. 8eadfaf
- [x] Task: Conductor - User Manual Verification 'Phase 1' (Protocol in workflow.md) b65602f

## Phase 2: Backend Implementation (Go) [checkpoint: 0dea25f]
- [x] Task: Update `sql/query.sql` to support cursor-based pagination for items and regenerate sqlc. d3f377e
- [x] Task: Update `cmd/feed-reader/handler.go` to match the new feed and tag proto definitions. 6f01f4a
- [x] Task: Update `cmd/feed-reader/item_handler.go` to match the new item proto definitions and implement cursor pagination. 6f01f4a
- [x] Task: Run backend tests and fix any breakages. 6f01f4a
- [x] Task: Conductor - User Manual Verification 'Phase 2' (Protocol in workflow.md) 0dea25f

## Phase 3: Frontend Implementation (TypeScript) [checkpoint: 8199701]
- [x] Task: Update `frontend/src/lib/` API clients and data models to use the new generated types and Date objects. 695a17f
- [x] Task: Update MSW mocks in `frontend/src/mocks/handlers.ts` to match the new API structure. 695a17f
- [x] Task: Update components in `frontend/src/components/` (e.g., FeedList, ItemList) to adapt to unified types and standardized pagination. 695a17f
- [x] Task: Run frontend tests and fix any breakages. 695a17f
- [x] Task: Conductor - User Manual Verification 'Phase 3' (Protocol in workflow.md) 8199701

## Phase 4: Final Validation
- [ ] Task: Run all CI checks (linting, tests) to ensure no regressions.
- [ ] Task: Conductor - User Manual Verification 'Phase 4' (Protocol in workflow.md)
