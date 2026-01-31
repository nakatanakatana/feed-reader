# Remove Deprecated HTML-to-Markdown Migration Batch

## Overview
Remove the one-time migration batch processing used to convert existing HTML content in the database to Markdown. 
This feature was intended for initial data migration and is no longer needed. Cleaning it up will improve codebase maintainability.

Note: The HTML-to-Markdown conversion functionality used during new article ingestion (`fetcher.go` and `converter.go`) is out of scope for this track and will be **retained**.

## Functional Requirements
- **Remove Configuration Flag:** Delete the `MIGRATE_CONTENT_MARKDOWN` configuration flag (environment variable) from the application startup.
- **Remove Batch Execution Logic:** Delete the call to `migrateHTMLToMarkdown` that was executed when the flag was enabled during startup.
- **Delete Related Files:** Remove `migrate_md.go`, which contains the migration logic, and its corresponding test file `migrate_md_test.go`.

## Non-Functional Requirements
- **Safety:** Ensure that the removal does not affect the existing feed fetching functionality (`fetcher.go`) or any other application startup processes.
- **Code Hygiene:** Do not modify code outside the targeted deletion scope (specifically, keep `converter.go` untouched).

## Acceptance Criteria
1. The application starts without errors even if the `MIGRATE_CONTENT_MARKDOWN` environment variable is set (the setting should be ignored or removed from the configuration struct).
2. The files `cmd/feed-reader/migrate_md.go` and `cmd/feed-reader/migrate_md_test.go` no longer exist in the file system.
3. The batch invocation code is completely removed from `cmd/feed-reader/main.go`.
4. The application builds successfully (`go build ./cmd/feed-reader`).
5. Existing tests pass (`go test ./...`).

## Out of Scope
- Modifying or deleting `cmd/feed-reader/converter.go` (it is still used by `fetcher.go`).
- Database schema changes.
