# Implementation Plan - OPML Management Enhancements

## Phase 1: Backend - OPML Export Logic (Go)
- [x] Task: Define ExportOpml RPC in proto 3d27209
- [x] Task: Create reproduction test case for OPML Export a6994c7
    - [x] Create `cmd/feed-reader/opml_export_test.go`
    - [ ] Define test cases for exporting feeds with and without tags
    - [ ] Assert that tags are correctly mapped to the `category` attribute
- [ ] Task: Implement OPML Export logic
    - [ ] Update `cmd/feed-reader/opml.go` to include `ExportOPML` function
    - [ ] Implement logic to fetch feeds and their tags from the database
    - [ ] Map internal feed models to OPML structure, flattening tags into `category` attribute
- [ ] Task: Create HTTP Handler for OPML Export
    - [ ] Update `cmd/feed-reader/handler.go` to add `exportOpml` endpoint
    - [ ] Ensure endpoint handles feed selection (e.g., via query IDs or POST body)
- [ ] Task: Conductor - User Manual Verification 'Backend - OPML Export Logic (Go)' (Protocol in workflow.md)

## Phase 2: Backend - OPML Import with Tags (Go)
- [ ] Task: Create reproduction test case for OPML Import with Tags
    - [ ] Create `cmd/feed-reader/opml_import_tags_test.go`
    - [ ] Create sample OPML content with `category` attributes and nested folders
    - [ ] Define expectations for tag creation and association
- [ ] Task: Update OPML Parser
    - [ ] Modify `cmd/feed-reader/opml.go` (or `opml_importer.go`) to extract `category` attributes
    - [ ] Modify parser to traverse nested `<outline>` elements and treat parent folders as tags
- [ ] Task: Update Import Logic to Persist Tags
    - [ ] Update `cmd/feed-reader/opml_importer.go` to handle tag persistence
    - [ ] Ensure new tags are created and existing tags are reused
    - [ ] Link imported feeds to their respective tags
- [ ] Task: Conductor - User Manual Verification 'Backend - OPML Import with Tags (Go)' (Protocol in workflow.md)

## Phase 3: Frontend - Export UI & Integration
- [ ] Task: Add "Export OPML" button to Bulk Action Bar
    - [ ] Create/Update `frontend/src/components/BulkActionBar.test.tsx` to verify button presence
    - [ ] Update `frontend/src/components/BulkActionBar.tsx` to include the Export button
    - [ ] Ensure button is only visible/active when feeds are selected
- [ ] Task: Implement Export API Integration
    - [ ] Implement service method in `frontend/src/lib/api.ts` (or similar) to call the export endpoint
    - [ ] Handle file download in the browser upon successful response
- [ ] Task: Conductor - User Manual Verification 'Frontend - Export UI & Integration' (Protocol in workflow.md)

## Phase 4: Frontend - Enhanced Import Error Handling
- [ ] Task: Design and Test Error Display Component
    - [ ] Create `frontend/src/components/ImportOpmlModal.ErrorHandling.test.tsx`
    - [ ] Define tests for rendering a list of errors (mocked data)
- [ ] Task: Implement Error List UI
    - [ ] Create a new component or update `ImportOpmlModal.tsx` to display errors in a list format
    - [ ] Ensure specific error messages and affected feed URLs are shown
- [ ] Task: Add Retry/Skip Actions
    - [ ] Implement "Retry" and "Skip" buttons for error items (if applicable via API)
    - [ ] Ensure the modal remains usable/dismissible even with errors
- [ ] Task: Conductor - User Manual Verification 'Frontend - Enhanced Import Error Handling' (Protocol in workflow.md)
