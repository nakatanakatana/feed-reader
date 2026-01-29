# Implementation Plan - Feed Content to Markdown Conversion

This plan outlines the steps to implement HTML-to-Markdown conversion on the backend, a migration for existing data, and a Markdown rendering component on the frontend.

## Phase 1: Backend Implementation & Migration [checkpoint: 3f0af2b]

Implement the conversion logic using `html-to-markdown` and prepare the data migration.

- [x] Task: Backend - Add `github.com/JohannesKaufmann/html-to-markdown` dependency ff29872
    - [ ] Run `go get github.com/JohannesKaufmann/html-to-markdown`
- [x] Task: Backend - Implement HTML to Markdown utility function be04afc
    - [ ] Create a utility in `cmd/feed-reader/` to handle the conversion logic.
    - [ ] Write tests to verify various HTML structures (links, images, lists) convert correctly to Markdown.
- [x] Task: Backend - Integrate conversion into Fetcher service 39d1830
    - [ ] Update `cmd/feed-reader/fetcher.go` to convert `Item` description and content before storage.
    - [ ] Write/Update tests in `cmd/feed-reader/fetcher_test.go` to verify Markdown is stored.
- [x] Task: Backend - Create Data Migration bbcff80
    - [ ] Create a one-time migration logic (possibly in `main.go` or a separate utility) to iterate through all existing items and convert their content.
    - [ ] Test the migration logic on a sample dataset.
- [x] Task: Conductor - User Manual Verification 'Phase 1: Backend Implementation & Migration' (Protocol in workflow.md) 3f0af2b

## Phase 2: Frontend Implementation

Create the Markdown rendering component and integrate it into the UI.

- [x] Task: Frontend - Add `markdown-it` and types cf299f1
    - [ ] Run `npm install markdown-it` and `npm install -D @types/markdown-it`
- [ ] Task: Frontend - Create `MarkdownRenderer` component
    - [ ] Create `frontend/src/components/MarkdownRenderer.tsx`.
    - [ ] Configure `markdown-it` with `{ html: false, linkify: true }`.
    - [ ] Write Vitest tests in `frontend/src/components/MarkdownRenderer.test.tsx` to verify rendering and XSS protection.
- [ ] Task: Frontend - Integrate `MarkdownRenderer` into Item Detail
    - [ ] Update `frontend/src/components/ItemDetailModal.tsx` to use `MarkdownRenderer` instead of direct HTML rendering.
    - [ ] Verify that existing tests for `ItemDetailModal` still pass or update them as needed.
- [ ] Task: Conductor - User Manual Verification 'Phase 2: Frontend Implementation' (Protocol in workflow.md)

## Phase 3: Final Verification & Cleanup

- [ ] Task: System - Run end-to-end manual verification
    - [ ] Add a new feed and verify its content is stored as Markdown.
    - [ ] Check existing feeds to ensure migration worked.
- [ ] Task: Conductor - User Manual Verification 'Phase 3: Final Verification & Cleanup' (Protocol in workflow.md)
