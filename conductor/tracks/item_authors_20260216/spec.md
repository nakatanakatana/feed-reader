# Specification: Item Author Storage and Schema Upgrade

## Overview
Currently, item author information is either not being saved correctly or is using an outdated format (single string) in the `items` table. Since the `gofeed` library now provides multiple authors via the `Authors` slice (array of `Person` objects), we will upgrade the database schema to a many-to-many relationship. This will establish a robust foundation for future author-based features, such as filtering or ignoring items from specific authors.

## Functional Requirements
1.  **Database Schema Overhaul**:
    -   Create a new `authors` table.
    -   Use UUID as the Primary Key for `authors.id` to maintain consistency with existing tables.
    -   Store author details: `name`, `email`, and `uri`.
    -   Create a junction table `item_authors` to establish a many-to-many relationship between `items` and `authors`.
2.  **Schema Cleanup**:
    -   Remove any existing, obsolete author columns from the `items` table. Since no data has been successfully stored in these columns yet, no data migration is required.
3.  **Feed Fetching Logic Update**:
    -   Update the crawling process (using `gofeed`) to extract author information from the `Item.Authors` slice and persist it into the `authors` and `item_authors` tables.
    -   Implement de-duplication: reuse existing `authors` records if the combination of `name`, `email`, and `uri` already exists.
4.  **API and Protobuf Updates**:
    -   Update the Connect RPC (Protobuf) definitions to include a list of authors for each item.
    -   Modify the item retrieval API to return the associated author details.

## Non-Functional Requirements
-   **Extensibility**: Ensure the structure easily accommodates a future "ignore author" feature.
-   **Type Safety**: Use `sqlc` for type-safe database operations.
-   **Testing**: Implement tests for schema changes and persistence logic following the TDD (Test-Driven Development) approach.

## Acceptance Criteria
-   [ ] The `authors` and `item_authors` tables are correctly defined in the schema.
-   [ ] Obsolete author columns are removed from the `items` table.
-   [ ] Multiple authors are correctly persisted during feed fetching.
-   [ ] Author records are de-duplicated and reused across multiple items.
-   [ ] The API returns a list of authors (name, email, uri) for each item.
-   [ ] Unit tests for the new schema and storage logic pass.

## Out of Scope
-   Implementing the UI or business logic for the "ignore author" feature (this track focuses on the data foundation).
-   Author profile editing functionality.
