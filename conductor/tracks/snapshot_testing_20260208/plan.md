# Implementation Plan: Introduction of Snapshot Testing (Golden Testing)

## Phase 1: Infrastructure Setup
- [ ] Task: Install `gotest.tools/v3` for the backend
    - [ ] Run `go get gotest.tools/v3` (Avoid `go mod tidy` until it's used in code)
- [ ] Task: Configure `Makefile` for snapshot updates
    - [ ] Add `test-update` target or ensure `go test ./... -args -update` is documented
- [ ] Task: Conductor - User Manual Verification 'Phase 1: Infrastructure Setup' (Protocol in workflow.md)

## Phase 2: Backend Snapshot Implementation
- [ ] Task: Implement golden testing in `cmd/feed-reader/converter_test.go`
    - [ ] Write tests that fail (Red Phase)
    - [ ] Refactor existing tests to use `golden.Assert`
    - [ ] Verify tests pass with generated golden files (Green Phase)
- [ ] Task: Implement golden testing in `cmd/feed-reader/handler_test.go`
    - [ ] Write tests that fail (Red Phase)
    - [ ] Refactor API response validations to use `golden.Assert`
    - [ ] Ensure dynamic fields (if any) are handled
    - [ ] Verify tests pass with generated golden files (Green Phase)
- [ ] Task: Finalize Backend Dependencies
    - [ ] Run `go mod tidy` now that `gotest.tools/v3` is utilized in code
- [ ] Task: Conductor - User Manual Verification 'Phase 2: Backend Snapshot Implementation' (Protocol in workflow.md)

## Phase 3: Frontend Snapshot Implementation
- [ ] Task: Implement snapshot testing for key UI components
    - [ ] Add `toMatchSnapshot()` tests for `FeedList.tsx`
    - [ ] Add `toMatchSnapshot()` tests for `ItemRow.tsx`
    - [ ] Add `toMatchSnapshot()` tests for `AddFeedForm.tsx`
- [ ] Task: Implement snapshot testing for data logic
    - [ ] Add snapshot tests for complex store/DB results if applicable
- [ ] Task: Conductor - User Manual Verification 'Phase 3: Frontend Snapshot Implementation' (Protocol in workflow.md)

## Phase 4: Verification, Linting and Documentation
- [ ] Task: Run full test suite and verify all snapshots
    - [ ] Execute `make test` and `npm test`
- [ ] Task: Verify Code Standards and Linting
    - [ ] Run `make lint` or equivalent for Go
    - [ ] Run `npm run lint` and `npx biome check .` for Frontend
    - [ ] Fix any linting or formatting issues introduced
- [ ] Task: Verify CI behavior
    - [ ] Ensure snapshots are correctly handled in CI environment
- [ ] Task: Conductor - User Manual Verification 'Phase 4: Verification, Linting and Documentation' (Protocol in workflow.md)
