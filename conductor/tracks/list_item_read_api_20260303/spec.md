# Track `list_item_read_api_20260303` Specification

## Overview
Add a new RPC `ListItemRead` to the `ItemService` to allow for delta synchronization of item read statuses. This will enable frontends or other clients to efficiently update their local state of read items by only fetching changes since their last synchronization point.

## Functional Requirements
- **API Extension:**
  - Add `rpc ListItemRead(ListItemReadRequest) returns (ListItemReadResponse)` to `ItemService` in `proto/item/v1/item.proto`.
  - **Request (`ListItemReadRequest`):**
    - `optional google.protobuf.Timestamp updated_after = 1`: If provided, only returns `item_reads` updated after this time.
  - **Response (`ListItemReadResponse`):**
    - `repeated ItemRead item_reads = 1`: A list of modified read states.
  - **Data Structure (`ItemRead`):**
    - `string item_id = 1`: The ID of the item.
    - `bool is_read = 2`: Whether the item is read.
    - `google.protobuf.Timestamp updated_at = 3`: The timestamp when this read state was last modified.

- **Backend Implementation:**
  - Update `store/query.sql` to include a new query `ListItemRead` that selects from the `item_reads` table filtered by `updated_at`.
  - Implement the service handler in `cmd/feed-reader/item_handler.go`.
  - Ensure the conversion between database `INTEGER` (for `is_read`) and Protobuf `bool` is handled correctly.
  - Convert ISO8601 strings from the database to Protobuf `Timestamp`.

## Non-Functional Requirements
- **Performance:** Efficient querying of the `item_reads` table.
- **Protocol Consistency:** Use existing Protobuf service patterns and types.

## Acceptance Criteria
- [ ] Protobuf definition for `ListItemRead` is correctly generated.
- [ ] `ListItemRead` endpoint returns item read statuses.
- [ ] When `updated_after` is provided, only items modified after that time are returned.
- [ ] The response includes the `item_id`, `is_read` status, and `updated_at` timestamp.
- [ ] Unit tests cover the new RPC with and without the `updated_after` filter.

## Out of Scope
- Implementation of the frontend client-side synchronization logic.
- Pagination (as per user choice).
- Filtering by tag or feed (as per user choice).
