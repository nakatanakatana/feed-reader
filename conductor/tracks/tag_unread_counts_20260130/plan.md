# Implementation Plan - Tag List Unread Counts

This plan outlines the steps to add unread item counts to the tag filter list in the item list view.

## Phase 1: Backend Infrastructure
- [x] Task: Update Tag Proto definition 58db2d5
    - [x] Add `int64 unread_count = 5;` to the `Tag` message in `proto/tag/v1/tag.proto`.
    - [x] Add `int64 total_unread_count = 2;` to the `ListTagsResponse` message in `proto/tag/v1/tag.proto`.
- [x] Task: Update SQL queries for unread counts 1f5f90c
    - [x] Add `CountUnreadItemsPerTag` to `sql/query.sql`.
    - [x] Add `CountTotalUnreadItems` to `sql/query.sql`.
- [~] Task: Regenerate code
    - [ ] Run `make gen` to update Go and TypeScript generated files.
- [ ] Task: Conductor - User Manual Verification 'Phase 1: Backend Infrastructure' (Protocol in workflow.md)

## Phase 2: Backend Implementation (TDD)
- [ ] Task: Update Store to fetch unread counts
    - [ ] Write failing tests in `store/tags_test.go` that verify unread counts for tags.
    - [ ] (Generated `sqlc` code will be used to implement the queries).
- [ ] Task: Update TagService to return unread counts
    - [ ] Write failing tests in `cmd/feed-reader/tag_service_test.go` to verify `ListTags` returns unread counts.
    - [ ] Update `cmd/feed-reader/tag_service.go` to fetch unread counts and populate the response.
- [ ] Task: Conductor - User Manual Verification 'Phase 2: Backend Implementation' (Protocol in workflow.md)

## Phase 3: Frontend Implementation (TDD)
- [ ] Task: Update ItemList component to display unread counts
    - [ ] Write failing tests in `frontend/src/components/ItemList.test.tsx` for unread count display.
    - [ ] Update `frontend/src/components/ItemList.tsx` to show `(count)` next to tag names.
- [ ] Task: Update FeedList component to display unread counts
    - [ ] Write failing tests in `frontend/src/components/FeedList.test.tsx` (if not already covered) for tag unread counts.
    - [ ] Update `frontend/src/components/FeedList.tsx` to show `(count)` next to tag names in the filter bar.
- [ ] Task: Conductor - User Manual Verification 'Phase 3: Frontend Implementation' (Protocol in workflow.md)
