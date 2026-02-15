# Track: OPML Management Enhancements

## Overview
This track focuses on enhancing the OPML management capabilities of the Feed Reader application. It includes adding functionality to export existing feeds to OPML, improving the import process to support tagging derived from OPML structure and attributes, and refining the error handling UI during import for better user visibility and actionability.

## Functional Requirements

### 1. OPML Export
- **Trigger:** Add an "Export OPML" button to the **Bulk Action Bar** that appears when one or more feeds are selected in the Feed List.
- **Scope:** The export operation should only include the currently selected feeds.
- **Format:**
    - The output format must be a valid OPML 2.0 XML file.
    - **Tag Representation:** Tags associated with a feed must be exported using the `category` attribute of the `<outline>` element.
    - **Structure:** The OPML body should be a flat list of `<outline>` elements. Nested folders are not used for export to support multi-tag relationships cleanly via the `category` attribute.
    - **Attributes:** Include standard attributes: `text`, `type` (rss/atom), `xmlUrl`, `htmlUrl`, and `category`.

### 2. OPML Import with Tagging
- **Source:** Enhance the existing OPML Import functionality.
- **Tag Parsing:**
    - The system must parse tags from the imported OPML file.
    - **Sources for Tags:**
        1.  **`category` Attribute:** Comma-separated values in the `category` attribute of an `<outline>` element.
        2.  **Nested Structure:** Parent `<outline>` elements (folders) should be treated as tags for their children.
- **Behavior:**
    - New tags found in the OPML file should be created automatically.
    - Existing tags should be reused.
    - Feeds should be associated with all identified tags (union of `category` tags and parent folder tags).

### 3. Enhanced Import Error Handling
- **UI Component:** Implement a dedicated, larger modal or a specific view state within the import modal for displaying errors.
- **Display:**
    - Present errors in a structured **list format**.
    - Each error item should display:
        - The affected feed name or URL (if available).
        - A clear, user-friendly error message (e.g., "Invalid URL", "Duplicate Feed").
- **Actions:**
    - Provide actionable options for each error or the batch of errors, such as:
        - **Skip:** Ignore the error and continue/finish.
        - **Retry:** Attempt to import the specific item again (useful for transient network issues).
        - *(Nice to have)* **Fix:** Allow inline editing of the URL if that is the cause of the error.

## Non-Functional Requirements
- **Performance:** Parsing and generating OPML files should be efficient, handling lists of hundreds of feeds without freezing the UI.
- **Usability:** Error messages must be written in plain language, avoiding technical jargon where possible.
- **Compatibility:** The generated OPML should be compatible with standard feed readers (e.g., Feedly, Inoreader).

## Acceptance Criteria
- [ ] User can select multiple feeds and click "Export OPML" to download a valid `.opml` file.
- [ ] The exported OPML file contains `category` attributes correctly representing all tags for each feed.
- [ ] Importing an OPML file with `category` attributes correctly assigns those tags to the imported feeds.
- [ ] Importing an OPML file with nested folders correctly assigns the folder names as tags to the child feeds.
- [ ] If an import fails for specific items, a detailed error list modal is displayed.
- [ ] User can dismiss the error modal or choose to skip/retry failed items.

## Out of Scope
- Exporting full folder structures (nested `<outline>`) is out of scope; we are using `category` attributes for the flat export.
- Synchronization with remote OPML subscriptions.
