# Implementation Plan - OPML Management Enhancements

## Phase 1: Backend - OPML Export Logic (Go) [checkpoint: 27ccc4d]
- [x] Task: Define ExportOpml RPC in proto 3d27209
- [x] Task: Create reproduction test case for OPML Export a6994c7
    - [x] Create `cmd/feed-reader/opml_export_test.go`
    - [ ] Define test cases for exporting feeds with and without tags
    - [ ] Assert that tags are correctly mapped to the `category` attribute
- [x] Task: Implement OPML Export logic 8c48a64
    - [x] Update `cmd/feed-reader/opml.go` to include `ExportOPML` function
    - [x] Implement logic to fetch feeds and their tags from the database
    - [x] Map internal feed models to OPML structure, flattening tags into `category` attribute
- [x] Task: Create gRPC Handler for OPML Export b6c7203
    - [x] Implement `ExportOpml` method in `cmd/feed-reader/handler.go`
    - [x] Ensure handler handles feed selection
- [x] Task: Conductor - User Manual Verification 'Backend - OPML Export Logic (Go)' (Protocol in workflow.md) 0fa52ae

## Phase 2: Backend - OPML Import with Tags (Go) [checkpoint: c6f4a05]
- [x] Task: Create reproduction test case for OPML Import with Tags 2bf172d
    - [x] Create `cmd/feed-reader/opml_import_tags_test.go`
    - [x] Create sample OPML content with `category` attributes and nested folders
    - [x] Define expectations for tag creation and association
- [x] Task: Update OPML Parser 9236d27
    - [x] Modify `cmd/feed-reader/opml.go` (or `opml_importer.go`) to extract `category` attributes
    - [x] Modify parser to traverse nested `<outline>` elements and treat parent folders as tags
- [x] Task: Update Import Logic to Persist Tags 9236d27
    - [x] Update `cmd/feed-reader/opml_importer.go` to handle tag persistence
    - [x] Ensure new tags are created and existing tags are reused
    - [x] Link imported feeds to their respective tags
- [x] Task: Conductor - User Manual Verification 'Backend - OPML Import with Tags (Go)' (Protocol in workflow.md) c6f4a05

## Phase 3: Frontend - Export UI & Integration
- [x] Task: Add "Export OPML" button to Bulk Action Bar 9208d07
    - [x] Create/Update `frontend/src/components/BulkActionBar.test.tsx` to verify button presence
    - [x] Update `frontend/src/components/BulkActionBar.tsx` to include the Export button
    - [x] Ensure button is only visible/active when feeds are selected
- [x] Task: Implement Export API Integration 9208d07
    - [x] Implement service method in `frontend/src/lib/api.ts` (or similar) to call the export endpoint
    - [x] Handle file download in the browser upon successful response
- [~] Task: Conductor - User Manual Verification 'Frontend - Export UI & Integration' (Protocol in workflow.md)

## Phase 4: Frontend - Enhanced Import Error Handling
- [x] Task: Design and Test Error Display Component 5ed723a
    - [x] Create `frontend/src/components/ImportOpmlModal.ErrorHandling.test.tsx`
    - [x] Define tests for rendering a list of errors (mocked data)
- [x] Task: Implement Error List UI 5ed723a
    - [x] Create a new component or update `ImportOpmlModal.tsx` to display errors in a list format
    - [x] Ensure specific error messages and affected feed URLs are shown
- [x] Task: Add Retry/Skip Actions 5ed723a
    - [x] Implement UI for viewing failed items
    - [x] Ensure the modal remains usable/dismissible even with errors
- [~] Task: Conductor - User Manual Verification 'Frontend - Enhanced Import Error Handling' (Protocol in workflow.md)
