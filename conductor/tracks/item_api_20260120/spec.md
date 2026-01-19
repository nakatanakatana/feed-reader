# Track Specification: Item Management API (item/v1)

## Overview
This track aims to implement a new API for managing articles (items) in the Feed Reader application. This includes retrieving articles with various filters and updating their status (read/unread, saved/unsaved).

## Functional Requirements

### API Definition
A new Connect RPC service `item.v1.ItemService` will be defined in `proto/item/v1/item.proto`.

### Operations
1. **GetItem**: Retrieve a single article by its unique ID.
2. **ListItems**: Retrieve a list of articles with support for:
    - **Filtering by Feed**: Get articles belonging to a specific feed.
    - **Filtering by Status**: Get articles based on their read/unread or saved/unsaved status.
    - **Sorting**: Order articles by their publication date (`published_at`) in descending or ascending order.
    - **Pagination**: Support limit and offset for large result sets.
3. **UpdateItemStatus**: Update the status of one or more articles.
    - Toggle read/unread status.
    - Toggle saved/unsaved status.

## Data Model

The `Item` resource corresponds to the `items` table, enriched with status information from tracking tables.

| Field | Type | Description |
|---|---|---|
| `id` | string (UUID) | Unique identifier for the item. |
| `url` | string | URL of the article. |
| `title` | string | Title of the article. |
| `description` | string | Summary or content of the article. |
| `published_at` | string (ISO8601) | Publication timestamp. |
| `feed_id` | string (UUID) | ID of the feed this item belongs to. |
| `is_read` | boolean | Whether the article has been read. |
| `is_saved` | boolean | Whether the article has been saved (bookmarked). |

## Non-Functional Requirements
- **Performance**: Item listing should be efficient even with a large number of articles (index on `published_at` and filter columns).
- **Type Safety**: Use Protobuf and `sqlc` to ensure type safety across the stack.
- **Test Coverage**: New code must have at least 80% unit test coverage.

## Acceptance Criteria
- [ ] `proto/item/v1/item.proto` defines the `ItemService` and necessary messages.
- [ ] Database schema updated to support `is_saved` status.
- [ ] `ListItems` correctly filters by `feed_id`, `is_read`, and `is_saved`.
- [ ] `ListItems` correctly sorts by `published_at`.
- [ ] `UpdateItemStatus` correctly updates the database.
- [ ] Connect RPC handlers are implemented in the Go backend.
- [ ] Unit tests for the service and store layers are implemented and passing.

## Out of Scope
- Full-text search of article content.
- Frontend implementation (this track focuses on the Backend API).
