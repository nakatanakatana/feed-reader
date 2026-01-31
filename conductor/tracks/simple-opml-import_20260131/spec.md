# Specification: Simple OPML Import and Feed Registration

## Overview
Simplify the OPML import and feed registration process to improve reliability and reduce complexity. This track involves moving from an asynchronous job-based import system to a synchronous one and changing the feed registration logic to defer item fetching to the background scheduler.

## Functional Requirements

### 1. Synchronous OPML Import
- Process OPML file uploads synchronously on the server.
- The client waits for the process to complete and receives the final results.
- Remove all asynchronous "import job" infrastructure, including jobs, workers, and progress tracking UI.

### 2. Streamlined Feed Registration (Unified)
- For all feed additions (manual and OPML import):
    - Fetch only feed metadata (title, site URL, etc.) during registration.
    - **Do NOT fetch or register items (articles) during the initial registration.**
- Item fetching will be handled solely by the existing background scheduler during its next crawl.

### 3. Error Handling and Deduplication
- Automatically skip feeds that are already registered (based on feed URL).
- If fetching metadata fails for a specific feed (e.g., network error), skip it and continue processing the rest of the OPML.
- Provide a summary report to the user at the end, listing any failed feed URLs.

### 4. UI/UX Enhancements
- Implement a loading state in the UI while the synchronous import is in progress.
- Refresh the feed list immediately after a successful import.
- Remove obsolete UI components related to background job monitoring.

## Non-Functional Requirements
- Ensure the synchronous registration process is efficient to prevent timeouts for moderately sized OPML files.
- Simplify the backend codebase by removing redundant job management logic.

## Acceptance Criteria
- [ ] OPML import executes synchronously, and new feeds appear in the list upon completion.
- [ ] Immediately after feed registration, feed metadata exists in the database, but no items (articles) are registered.
- [ ] Duplicate feeds are skipped, and failed feeds are correctly reported in the final summary.
- [ ] Code and UI related to asynchronous import jobs are completely removed.

## Out of Scope
- Adding a button to manually trigger immediate item fetching after import.
- Changes to the OPML export functionality.
