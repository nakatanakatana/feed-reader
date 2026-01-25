# Specification: Refactor Tag Operations into a Dedicated Proto Package

## Overview
Currently, Tag management operations and the `Tag` message are part of the `feed.v1` package. To improve modularity and separation of concerns, this track involves moving all Tag-specific definitions and services into a new `tag.v1` package.

## Functional Requirements
- **New Proto Package**: Create a new package `tag.v1` in `proto/tag/v1/tag.proto`.
- **Message Migration**: Move the `Tag` message from `feed.v1` to `tag.v1`.
- **Service Migration**: Create a new `TagService` in `tag.v1` and move the following RPCs from `FeedService` to it:
  - `CreateTag`
  - `ListTags`
  - `DeleteTag`
- **Feed Integration**: 
  - Update `feed.v1` to import `tag/v1/tag.proto`.
  - Update the `Feed` message in `feed.v1` to use `tag.v1.Tag` for its `tags` field.
- **SetFeedTags**: Keep `SetFeedTags` in `FeedService` as it primarily manages the relationship from the Feed's perspective.
- **Code Generation**: Re-generate Go and TypeScript code for both `feed.v1` and `tag.v1`.

## Non-Functional Requirements
- **Backward Compatibility**: This is a breaking change for the API structure. Ensure all internal references in the backend (Go) and frontend (TypeScript/SolidJS) are updated to match the new package structure.
- **Consistency**: Maintain the same field names and types for moved messages and RPCs.

## Acceptance Criteria
- [ ] `proto/tag/v1/tag.proto` exists with the `Tag` message and `TagService`.
- [ ] `proto/feed/v1/feed.proto` no longer contains the `Tag` message or tag management RPCs (except `SetFeedTags`).
- [ ] `proto/feed/v1/feed.proto` imports `tag/v1/tag.proto` and references `tag.v1.Tag`.
- [ ] Backend code (Go) is updated to implement `TagService` in the new package and correctly uses the new generated types.
- [ ] Frontend code (TypeScript) is updated to use the new `TagService` and generated types.
- [ ] All existing tests (unit and integration) pass after the migration.
- [ ] The application remains fully functional (Tag creation, listing, deletion, and assignment to feeds).

## Out of Scope
- Adding new features to Tag management.
- Refactoring the underlying database schema (unless absolutely necessary for the proto change).
