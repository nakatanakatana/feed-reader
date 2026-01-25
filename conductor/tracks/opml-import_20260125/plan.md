# Implementation Plan - Track: OPML Import

## Phase 1: Backend Implementation [checkpoint: c5cf62a]
- [x] Task: Define `ImportOpml` RPC in `proto/feed/v1/feed.proto` 6e3f151
    - [x] Add `ImportOpmlRequest` with `bytes opml_content`
    - [x] Add `ImportOpmlResponse` with `int32 total`, `int32 success`, `int32 skipped`, `repeated string failed_feeds`
    - [x] Add RPC method definition
- [x] Task: Generate code d389b53
    - [x] Run `make gen` to update Go and TS definitions
- [x] Task: Implement OPML Parsing Logic 742e1a1
    - [x] Create utility function/struct to parse OPML XML content
    - [x] Write unit tests for parser with various sample inputs
- [x] Task: Implement `ImportOpml` Service Handler d910981
    - [x] Implement deduplication logic (check URL existence)
    - [x] Implement bulk creation of feeds
    - [x] Trigger async fetch for new feeds
    - [x] Return stats in response
- [x] Task: Backend Tests 51937fd
    - [x] Write integration/service tests for `ImportOpml`
- [x] Task: Conductor - User Manual Verification 'Backend Implementation' (Protocol in workflow.md) c5cf62a

## Phase 2: Frontend Implementation
- [x] Task: Create `ImportOpmlModal` Component 729788f
- [x] Task: Integrate API 729788f
    - [ ] Use generated Connect client to call `ImportOpml`
    - [ ] Handle success and error states
- [x] Task: Add Entry Point c439855
    - [ ] Add "Import OPML" button to the Feeds List page
- [ ] Task: Frontend Tests
    - [ ] Write unit tests for the Modal component
    - [ ] Write integration test for the import flow
- [ ] Task: Conductor - User Manual Verification 'Frontend Implementation' (Protocol in workflow.md)
