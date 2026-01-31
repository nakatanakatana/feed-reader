# Track Specification: Fix SQLite Busy Error in OPML Import

## Overview
This track addresses the issue where OPML imports fail due to SQLite `database is locked` (busy) errors when registering a large number of feeds simultaneously. To resolve this, the import process will be made asynchronous, leveraging the existing `write-queue` mechanism to serialize database writes. Additionally, an import job management system will be introduced to allow users to track the progress of asynchronous imports.

## Functional Requirements

### 1. Asynchronous OPML Import
- Modify the `ImportOpml` RPC to initiate a background import task and return an import job ID immediately.
- The background task will iterate through each feed in the OPML and perform:
    - Duplication check (verify if the URL already exists).
    - Fetching feed metadata (Network I/O).
    - Submitting write jobs to the `write-queue` to ensure serialized DB access.

### 2. Import Job Management
- Create a new `import_jobs` table to manage the lifecycle of an import:
    - `id` (UUID): Unique identifier for the job.
    - `status`: One of `queued`, `processing`, `completed`, or `failed`.
    - `total_feeds`: Total number of feeds detected in the OPML.
    - `processed_feeds`: Number of feeds successfully or skippingly processed.
    - `failed_feeds`: List of feed URLs that failed to be imported (stored as JSON or separate table).
    - `created_at`, `updated_at`: Timestamps.
- Introduce a new RPC:
    - `GetImportStatus(GetImportStatusRequest) returns (GetImportStatusResponse)`
        - Returns the current progress and status of a specific job ID.

### 3. API Definition Changes (`proto/feed/v1/feed.proto`)
- Update `ImportOpmlResponse` to include `job_id`.
- Define `GetImportStatus` RPC and its associated request/response messages.

## Non-Functional Requirements
- **Reliability:** Eliminate SQLite lock contention errors by using the `write-queue`.
- **User Experience:** Prevent UI blocking during large imports and provide a way to monitor progress.

## Acceptance Criteria
- [ ] Importing an OPML with many feeds completes without `SQLite busy` errors.
- [ ] `ImportOpml` returns a `job_id` immediately after submission.
- [ ] `GetImportStatus` accurately reflects the number of processed feeds and the current status.
- [ ] Upon completion, the job status is correctly updated to `completed`.

## Out of Scope
- Long-term persistence/archiving of import jobs (auto-cleanup logic is not included in this track).
- Major frontend UI overhaul (focus is on backend API and providing progress data).
