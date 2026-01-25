# Implementation Plan - Refactor Tag Operations into a Dedicated Proto Package

## Phase 1: Proto Definition & Generation
- [x] Task: Create new proto package `tag.v1` 091fd30
    - [x] Create `proto/tag/v1/tag.proto`
    - [x] Define `Tag` message and `TagService` in `tag.v1`
    - [x] Move `CreateTag`, `ListTags`, `DeleteTag` RPC definitions to `TagService`
- [x] Task: Update `feed.v1` proto 091fd30
    - [x] Import `tag/v1/tag.proto` in `proto/feed/v1/feed.proto`
    - [x] Replace `Tag` message definition in `feed.v1` with usage of `tag.v1.Tag`
    - [x] Remove `CreateTag`, `ListTags`, `DeleteTag` RPCs from `FeedService`
- [x] Task: Generate code 091fd30
    - [x] Run `buf generate` (or equivalent) to regenerate Go and TypeScript code
- [ ] Task: Conductor - User Manual Verification 'Proto Definition & Generation' (Protocol in workflow.md)

## Phase 2: Backend Implementation (Go)
- [ ] Task: Implement `TagService`
    - [ ] Create `cmd/feed-reader/tag_service.go` (or similar)
    - [ ] Implement `CreateTag`, `ListTags`, `DeleteTag` handlers in `TagService` (move logic from `FeedService`)
    - [ ] Wire up `TagService` in `main.go`
- [ ] Task: Refactor `FeedService`
    - [ ] Remove `CreateTag`, `ListTags`, `DeleteTag` handlers from `FeedService`
    - [ ] Update `Feed` message construction to use `tagv1.Tag`
    - [ ] Update `SetFeedTags` implementation if necessary (likely just type updates)
- [ ] Task: Update Tests
    - [ ] Move/Refactor unit tests for Tag operations to `tag_service_test.go`
    - [ ] Update existing `FeedService` tests to reflect changes
- [ ] Task: Conductor - User Manual Verification 'Backend Implementation (Go)' (Protocol in workflow.md)

## Phase 3: Frontend Implementation (TypeScript)
- [ ] Task: Update API Client usage
    - [ ] Instantiate `TagService` client in `frontend/src/lib/client.ts` (or wherever clients are created)
    - [ ] Update `frontend/src/lib/tag-query.ts` (and similar) to use `TagService` for tag operations
- [ ] Task: Update Components
    - [ ] Refactor components using `Tag` type to use the new `tag.v1.Tag` type
    - [ ] Ensure `TagManagement` component calls `TagService` instead of `FeedService`
- [ ] Task: Verify Integration
    - [ ] Run frontend tests and fix any type errors or logic breaks
- [ ] Task: Conductor - User Manual Verification 'Frontend Implementation (TypeScript)' (Protocol in workflow.md)

## Phase 4: Final Verification
- [ ] Task: Run full test suite (Backend & Frontend)
- [ ] Task: Manual smoke test of all Tag features
- [ ] Task: Conductor - User Manual Verification 'Final Verification' (Protocol in workflow.md)