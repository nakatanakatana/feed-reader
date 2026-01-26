# Specification: Add updated_at sorting to Feed and Tag APIs

## Overview
This track adds the ability to sort the results of the `ListFeeds` and `ListTags` API endpoints by their `updated_at` timestamp. The default behavior will be changed to sort by `updated_at` in ascending order. Users will also be able to explicitly specify whether they want the results in ascending or descending order.

## Functional Requirements

### 1. API Changes (`proto`)

#### `feed.v1.FeedService.ListFeeds`
-   Modify `ListFeedsRequest` to include:
    -   `optional bool sort_descending`: If true, sort by `updated_at` in descending order. If false or omitted, sort by `updated_at` in ascending order.

#### `tag.v1.TagService.ListTags`
-   Modify `ListTagsRequest` to include:
    -   `optional bool sort_descending`: If true, sort by `updated_at` in descending order. If false or omitted, sort by `updated_at` in ascending order.

### 2. Backend Implementation (Go)

-   **Database Queries:** Update SQL queries for listing feeds and tags to include `ORDER BY updated_at ASC` (default) or `ORDER BY updated_at DESC`.
-   **Service Logic:** Update the `FeedService` and `TagService` implementations to handle the new `sort_descending` parameter and pass it to the store layer.
-   **Default Behavior:** If the parameter is not provided, the API must return items sorted by `updated_at` ASC.

## Non-Functional Requirements
-   **Performance:** Ensure that sorting by `updated_at` is efficient. (Verify if an index on `updated_at` is needed for both tables).
-   **Consistency:** The sorting behavior should be identical across both `ListFeeds` and `ListTags` endpoints.

## Acceptance Criteria
-   `ListFeeds` returns feeds sorted by `updated_at` ASC by default.
-   `ListFeeds` returns feeds sorted by `updated_at` DESC when `sort_descending=true`.
-   `ListTags` returns tags sorted by `updated_at` ASC by default.
-   `ListTags` returns tags sorted by `updated_at` DESC when `sort_descending=true`.
-   All existing functionality (e.g., filtering `ListFeeds` by `tag_id`) continues to work correctly with sorting.

## Out of Scope
-   Frontend UI changes to support or display the new sorting.
-   Sorting by fields other than `updated_at`.
