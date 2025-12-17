# Feed Specification

## Overview
This document describes the specification for the Feed resource in the Feed Reader application.

## Data Model

The Feed resource corresponds to the `feeds` table in the database.

| Field | Type | Required | Description |
|---|---|---|---|
| `uuid` | TEXT | Yes | Primary Key. Generated using UUIDv4. |
| `url` | TEXT | Yes | The URL of the feed. Must be unique. |
| `title` | TEXT | No | The title of the feed. |
| `link` | TEXT | No | The link to the website. |
| `description` | TEXT | No | The description of the feed. |
| `language` | TEXT | No | The language of the feed. |
| `image_url` | TEXT | No | The URL of the feed image. |
| `copyright` | TEXT | No | Copyright information. |
| `feed_type` | TEXT | No | Type of the feed (e.g., RSS 2.0, Atom). |
| `feed_version` | TEXT | No | Version of the feed format. |
| `last_fetched_at` | TEXT | No | Timestamp of the last successful fetch. |
| `created_at` | TEXT | Yes | Timestamp when the record was created. Defaults to CURRENT_TIMESTAMP. |
| `updated_at` | TEXT | Yes | Timestamp when the record was last updated. Defaults to CURRENT_TIMESTAMP. |

## API Specification

The Feed Service is defined using Protocol Buffers.

### CreateFeed
Creates a new feed.

- **Request**:
    - `url` (Required): The URL of the RSS/Atom feed.
    - `title` (Optional): The title of the feed. If not provided, it defaults to NULL (or empty string in some contexts).
    - Other optional fields: `link`, `description`, `language`, `image_url`, `copyright`, `feed_type`, `feed_version`.
- **Response**: The created `Feed` object.
- **Behavior**:
    - Generates a new UUIDv4.
    - Inserts the record into the database.
    - Returns `CodeInternal` if the URL already exists (Future improvement: Should return `CodeAlreadyExists`).

### GetFeed
Retrieves a feed by UUID.

- **Request**:
    - `uuid` (Required): The UUID of the feed.
- **Response**: The `Feed` object.
- **Errors**:
    - `CodeNotFound`: If the feed does not exist.

### ListFeeds
Lists all feeds.

- **Request**: Empty.
- **Response**: A list of `Feed` objects, ordered by `created_at` descending.

### UpdateFeed
Updates an existing feed.

- **Request**:
    - `uuid` (Required): The UUID of the feed to update.
    - `title` (Optional): The new title.
    - Other optional fields: `link`, `description`, `language`, `image_url`, `copyright`, `feed_type`, `feed_version`, `last_fetched_at`.
- **Constraints**:
    - **URL cannot be updated.** The `url` field is not present in the update request.
- **Response**: The updated `Feed` object.
- **Errors**:
    - `CodeNotFound`: If the feed does not exist.

### DeleteFeed
Deletes a feed.

- **Request**:
    - `uuid` (Required): The UUID of the feed to delete.
- **Response**: Empty.
- **Behavior**:
    - Deletes the record from the database.
