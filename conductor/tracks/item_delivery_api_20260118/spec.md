# Specification: Item Delivery API

## Overview
Add APIs for users to browse and manage items (articles) from their subscribed feeds. This includes listing items for specific feeds, a global timeline across all feeds, retrieving individual item details, and managing read/unread statuses.

## Functional Requirements

### 1. Global Timeline (ListGlobalItems)
- Retrieve items from all subscribed feeds, ordered by publication date (descending).
- Support cursor-based pagination.
- Provide filtering to show only unread items.

### 2. Feed-Specific Item List (ListFeedItems)
- Retrieve items belonging to a specific feed ID.
- Support cursor-based pagination.
- Provide filtering to show only unread items.

### 3. Item Detail Retrieval (GetItem)
- Retrieve full details for a specific item ID, including title, content, author, images, and media enclosures.

### 4. Read Status Management
- Provide an API to mark a specific item as read.
- Support marking multiple items as read (optional/batch).

## Data Model (Item)
The item data structure returned by the API will include:
- `id`: Unique identifier (UUID).
- `feed_id`: ID of the parent feed.
- `title`: Title of the article.
- `url`: Original URL of the article.
- `content`: Content or summary of the article.
- `author`: Author's name.
- `published_at`: Publication timestamp.
- `image_url`: URL for the thumbnail or featured image.
- `enclosures`: List of attached media (e.g., podcasts, attachments).
- `is_read`: Boolean flag indicating if the item has been read.

## Non-Functional Requirements
- **Performance:** Ensure fast response times even with a large number of items through cursor-based pagination and optimized database indexing.
- **Type Safety:** Use Protobuf (Connect RPC) to maintain consistent type definitions between the frontend and backend.

## Acceptance Criteria
- [ ] Users can retrieve a chronological timeline of items from all feeds.
- [ ] Users can retrieve items for a specific feed.
- [ ] Unread filtering works correctly for both global and feed-specific lists.
- [ ] Items can be marked as read, and the status is reflected in subsequent requests.
- [ ] Pagination works correctly using cursors to fetch subsequent pages.

## Out of Scope
- Full-text search for items.
- Item "starring" or bookmarking functionality.
- Offline reading support.
