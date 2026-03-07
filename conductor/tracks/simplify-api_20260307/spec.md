# Specification: API Simplification and Standardization

## Overview
Currently, the API has several unused fields, inconsistent naming conventions, and redundant message types (e.g., `ListItem` vs `Item`). This track aims to simplify the API by removing unused attributes, standardizing date/time representations, and unifying message structures to provide a more consistent developer experience.

## Functional Requirements

### 1. Remove Unused Fields
- Remove the following fields from `feed.v1.Feed` and related messages:
    - `lang`
    - `copyright`
    - `feed_type`
    - `feed_version`
- (Note: Database columns can remain for now to avoid data loss, but they will no longer be exposed via the API.)

### 2. Standardize Date/Time Representations
- Change all `string` date/time fields to `google.protobuf.Timestamp`:
    - `tag.v1.Tag`: `created_at`, `updated_at`
    - `feed.v1.Feed`: `last_fetched_at`, `created_at`, `updated_at`, `next_fetch`
    - `item.v1.Item`: `published_at`, `created_at`
    - `item.v1.ItemFeed`: `published_at`, `created_at`

### 3. Unified Naming Conventions
- Rename `next_fetch` to `next_fetch_at` in all relevant messages to align with the `_at` suffix convention used for other timestamps.
- Rename `updated_since` to `since` in `item.v1.ListItemReadRequest` to match the naming used in `item.v1.ListItemsRequest`.

### 4. Unify Message Types
- Eliminate redundant "List" message types and use the primary entity types consistently:
    - Remove `tag.v1.ListTag` and use `tag.v1.Tag` in `ListTagsResponse`.
    - Remove `feed.v1.ListFeed` and use `feed.v1.Feed` in `ListFeedsResponse`.
    - Remove `item.v1.ListItem` and use `item.v1.Item` in `ListItemsResponse`.
- Ensure the primary entity types have all necessary fields, making them `optional` where appropriate if they are not always populated.

### 5. Standardize Pagination
- Align `ListItems` request to use `page_size` and `page_token` (cursor-based pagination) to match `ListItemRead`, providing a more consistent and scalable pagination strategy.
- Rename `limit` to `page_size` in any remaining list requests if applicable.

## Non-Functional Requirements
- **Breaking Changes**: Since breaking changes are explicitly accepted, we will prioritize the cleanest API design over backward compatibility.
- **Type Safety**: Use Protobuf types effectively (especially `Timestamp`) to ensure strong typing across Go and TypeScript.

## Acceptance Criteria
- [ ] Protobuf definitions are updated and compiled successfully.
- [ ] Go backend implementation is updated to match new Proto definitions.
- [ ] TypeScript frontend and MSW mocks are updated to match new Proto definitions.
- [ ] All existing tests pass, and new tests are added for any changed logic (e.g., pagination).
- [ ] UI correctly displays data using the unified message structures and `Timestamp` types.

## Out of Scope
- Migrating existing database data to remove the unused columns (this can be done in a separate maintenance track).
- Adding new features to the API beyond simplification and standardization.
