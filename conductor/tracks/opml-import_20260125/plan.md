# Implementation Plan - Track: OPML Import

## Phase 1: Backend Implementation
- [ ] Task: Define `ImportOpml` RPC in `proto/feed/v1/feed.proto`
    - [ ] Add `ImportOpmlRequest` with `bytes opml_content`
    - [ ] Add `ImportOpmlResponse` with `int32 total`, `int32 success`, `int32 skipped`, `repeated string failed_feeds`
    - [ ] Add RPC method definition
- [ ] Task: Generate code
    - [ ] Run `make gen` to update Go and TS definitions
- [ ] Task: Implement OPML Parsing Logic
    - [ ] Create utility function/struct to parse OPML XML content
    - [ ] Write unit tests for parser with various sample inputs
- [ ] Task: Implement `ImportOpml` Service Handler
    - [ ] Implement deduplication logic (check URL existence)
    - [ ] Implement bulk creation of feeds
    - [ ] Trigger async fetch for new feeds
    - [ ] Return stats in response
- [ ] Task: Backend Tests
    - [ ] Write integration/service tests for `ImportOpml`
- [ ] Task: Conductor - User Manual Verification 'Backend Implementation' (Protocol in workflow.md)

## Phase 2: Frontend Implementation
- [ ] Task: Create `ImportOpmlModal` Component
    - [ ] Implement file selection input
    - [ ] Implement upload state UI (loading spinner)
    - [ ] Implement results summary view
- [ ] Task: Integrate API
    - [ ] Use generated Connect client to call `ImportOpml`
    - [ ] Handle success and error states
- [ ] Task: Add Entry Point
    - [ ] Add "Import OPML" button to the Feeds List page
- [ ] Task: Frontend Tests
    - [ ] Write unit tests for the Modal component
    - [ ] Write integration test for the import flow
- [ ] Task: Conductor - User Manual Verification 'Frontend Implementation' (Protocol in workflow.md)
