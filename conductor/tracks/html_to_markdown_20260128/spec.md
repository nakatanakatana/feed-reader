# Specification: Feed Content to Markdown Conversion

## Overview
Currently, the application stores and displays feed items as raw HTML in the `description` and `content` fields. This track aims to improve data consistency and simplify the frontend rendering by converting this HTML content into Markdown during the ingestion process on the backend. The frontend will then render this Markdown back into HTML for display.

## Goals
- Convert HTML content of feed items to Markdown on the backend during fetching and storage.
- Update existing data in the database to Markdown via a migration.
- Implement a reusable Markdown rendering component in the frontend using `markdown-it`.
- Ensure secure rendering by disabling raw HTML parsing in the Markdown engine.

## Functional Requirements

### Backend (Go)
1.  **HTML to Markdown Conversion:**
    -   Integrate `github.com/JohannesKaufmann/html-to-markdown` to convert `description` and `content` fields from HTML to Markdown.
    -   Perform conversion in the `fetcher` service before saving items to the database.
2.  **Data Migration:**
    -   Provide a mechanism (e.g., a one-time migration script or logic) to convert existing HTML data in the `description` and `content` columns of the `items` table to Markdown.
3.  **Storage:**
    -   Continue using the existing `description` and `content` columns to store the converted Markdown strings.

### Frontend (SolidJS)
1.  **Markdown Component:**
    -   Create a reusable component (e.g., `MarkdownRenderer.tsx`) that wraps `markdown-it`.
2.  **Rendering Logic:**
    -   Configure `markdown-it` with `html: false` and `linkify: true` to ensure security and convenience.
3.  **Integration:**
    -   Replace existing raw HTML rendering (e.g., using `innerHTML`) in the item detail view with the new `MarkdownRenderer` component.

## Non-Functional Requirements
- **Security:** Ensure no raw HTML is rendered from the Markdown to prevent XSS attacks.
- **Performance:** Ensure the backend conversion doesn't significantly delay the feed fetching process.
- **Maintainability:** The frontend component should be easy to use across different views if needed.

## Acceptance Criteria
- [ ] New feed items have their `description` and `content` stored as Markdown in the database.
- [ ] Existing feed items in the database are successfully converted to Markdown.
- [ ] The item detail view correctly renders Markdown content as formatted HTML.
- [ ] Malicious HTML tags within the Markdown are not executed/rendered.
- [ ] Images and links from the original content are preserved in the Markdown conversion and rendering.

## Out of Scope
- Support for complex HTML structures that don't map well to Markdown (will be handled by the library's best-effort conversion).
- Custom Markdown extensions/plugins beyond basic rendering.
