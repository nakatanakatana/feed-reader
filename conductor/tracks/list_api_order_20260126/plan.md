# Implementation Plan: Add updated_at sorting to Feed and Tag APIs

This plan covers the addition of sorting by `updated_at` to the `ListFeeds` and `ListTags` API endpoints.

## Phase 1: Protocol and Schema Updates
Update Protobuf definitions and database queries to support sorting.

- [ ] Task: Update `proto/feed/v1/feed.proto` to add `sort_descending` to `ListFeedsRequest`
- [ ] Task: Update `proto/tag/v1/tag.proto` to add `sort_descending` to `ListTagsRequest`
- [ ] Task: Run `make gen` to regenerate Go and TypeScript code from proto files
- [ ] Task: Add indexes for `updated_at` in `sql/schema.sql` to optimize sorting
- [ ] Task: Update `sql/query.sql` to add sorting logic to `ListFeeds` and `ListTags` queries
- [ ] Task: Run `make sqlc` to regenerate Go database code
- [ ] Task: Conductor - User Manual Verification 'Phase 1: Protocol and Schema Updates' (Protocol in workflow.md)

## Phase 2: Store Layer Implementation
Update the store layer to pass sorting parameters to the database queries.

- [ ] Task: Update `store/feed_store.go` to support `sort_descending` in `ListFeeds`
- [ ] Task: Update `store/tag_store.go` to support `sort_descending` in `ListTags`
- [ ] Task: Add unit tests in `store/feed_store_test.go` for sorting feeds
- [ ] Task: Add unit tests in `store/tags_test.go` for sorting tags
- [ ] Task: Conductor - User Manual Verification 'Phase 2: Store Layer Implementation' (Protocol in workflow.md)

## Phase 3: Service Layer Implementation
Update the service handlers to handle the new proto parameters.

- [ ] Task: Update `cmd/feed-reader/handler.go` (or relevant feed handler) to handle `ListFeeds` sorting
- [ ] Task: Update `cmd/feed-reader/tag_service.go` to handle `ListTags` sorting
- [ ] Task: Add integration tests in `cmd/feed-reader/handler_test.go` (or relevant test file) for `ListFeeds` API
- [ ] Task: Add integration tests in `cmd/feed-reader/tag_service_test.go` for `ListTags` API
- [ ] Task: Conductor - User Manual Verification 'Phase 3: Service Layer Implementation' (Protocol in workflow.md)

## Phase 4: Final Verification
Ensure everything is working correctly and follows project standards.

- [ ] Task: Run all tests (`go test ./...`)
- [ ] Task: Run linting (`golangci-lint run`)
- [ ] Task: Run build (`go build -o dist/ ./cmd/...`)
- [ ] Task: Conductor - User Manual Verification 'Phase 4: Final Verification' (Protocol in workflow.md)
