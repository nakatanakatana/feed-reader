# Implementation Plan: Feed Tagging System

## Phase 1: Database and Backend Schema [checkpoint: b6d6db7]
- [x] Task: Create migration for `tags` and `feed_tags` tables in `sql/schema.sql` [c6286e5]
- [x] Task: Define SQL queries for tag CRUD and filtering in `sql/query.sql` [66428ed]
- [x] Task: Run `sqlc generate` and verify generated Go code [4c6a042]
- [x] Task: Conductor - User Manual Verification 'Phase 1: Database and Backend Schema' (Protocol in workflow.md) [b6d6db7]

## Phase 2: Protobuf and API Definition [checkpoint: f393f00]
- [x] Task: Update `proto/feed/v1/feed.proto` to include Tag-related messages and service methods [c163958]
- [x] Task: Update `proto/item/v1/item.proto` to support filtering by tag IDs [9b876e9]
- [x] Task: Run `buf generate` to update Go and TypeScript Connect RPC code [e4ef41b]
- [x] Task: Conductor - User Manual Verification 'Phase 2: Protobuf and API Definition' (Protocol in workflow.md) [f393f00]

## Phase 3: Backend Implementation (TDD) [checkpoint: 75b1e2a]
- [x] Task: Implement Tag management logic in `store/` (CRUD operations) [07f87a9]
- [x] Task: Implement `FeedService` updates to handle tag associations in `cmd/feed-reader/` [a1d39f5]
- [x] Task: Implement `ItemService` updates to support tag-based article filtering in `cmd/feed-reader/` [c97a73d]
- [x] Task: Conductor - User Manual Verification 'Phase 3: Backend Implementation (TDD)' (Protocol in workflow.md) [75b1e2a]

## Phase 4: Frontend Implementation (TDD)
- [x] Task: Update frontend API clients and mocks for new Tag-related endpoints [9f05470]
- [x] Task: Create `TagManagement` components and management view [003d4a7]
- [x] Task: Update `AddFeedForm` and `FeedList` to support tag selection and display [7ba9105]
- [x] Task: Implement tag filtering logic in the Feed and Article list views [4e882e1]
- [~] Task: Conductor - User Manual Verification 'Phase 4: Frontend Implementation (TDD)' (Protocol in workflow.md)

## Phase 5: UI/UX Polishing and Final Integration
- [ ] Task: Refine Tag chip styling using Panda CSS
- [ ] Task: Final end-to-end testing of the tagging and filtering flow
- [ ] Task: Conductor - User Manual Verification 'Phase 5: UI/UX Polishing and Final Integration' (Protocol in workflow.md)
