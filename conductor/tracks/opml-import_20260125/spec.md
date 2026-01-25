# Track Specification: OPML Feed Import

## Overview
This track introduces the ability for users to import their existing feed subscriptions from other RSS readers using the standard OPML (Outline Processor Markup Language) format. This feature simplifies onboarding for new users by allowing bulk addition of feeds.

## Functional Requirements

### Frontend
- **Import Trigger:** Add an "Import OPML" button to the main Feeds list page (`/feeds`).
- **Upload Modal:** Clicking the button opens a modal that allows the user to select an `.opml` or `.xml` file from their local system.
- **Processing State:** Display a loading indicator/spinner while the file is being uploaded and processed by the backend.
- **Completion Feedback:** After processing, display a summary of the import results:
    - Total number of feeds found in the OPML file.
    - Number of feeds successfully imported.
    - Number of feeds skipped (due to duplication).
    - List of feeds that failed to import (e.g., invalid URLs).

### Backend
- **OPML Parsing:** Implement a service to parse OPML files and extract feed titles and URLs.
- **Deduplication:** Check each extracted feed URL against the existing database. Skip registration for URLs that are already subscribed.
- **Bulk Registration:** Efficiently register new feeds in the database.
- **Initial Fetch:** Trigger an immediate background fetch for each newly added feed to ensure content is available right away.
- **API Endpoint:** Create a new Connect RPC endpoint (e.g., `ImportOPML`) that accepts file data and returns the processing summary.

## Non-Functional Requirements
- **File Size Limit:** Impose a reasonable limit on the uploaded file size (e.g., 5MB).
- **Timeouts:** Ensure the backend process handles large OPML files without timing out the RPC request, or provide status updates if necessary (though a simple wait is preferred initially).

## Acceptance Criteria
1. User can click "Import OPML" and select a valid OPML file.
2. The system correctly identifies all feed URLs within the file.
3. Existing feeds are not duplicated.
4. New feeds are added and their articles start appearing in the application shortly after import.
5. A summary modal or message is shown after the process finishes.
6. Invalid OPML files or network errors are handled gracefully with appropriate error messages.

## Out of Scope
- **Export to OPML:** This track focuses only on importing.
- **Category/Folder Mapping:** Maintaining the folder structure from OPML is not required for this initial version.
- **Progressive UI:** Real-time progress updates for each feed registration.
