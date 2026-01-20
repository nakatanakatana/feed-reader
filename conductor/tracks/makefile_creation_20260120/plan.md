# Implementation Plan: Makefile for Unified Project Management

This plan outlines the steps to create a centralized `Makefile` for the project, providing a consistent interface for common development tasks.

## Phase 1: Foundation and Implementation [checkpoint: da47a24]

### Task: Setup and Makefile Creation
- [x] Task: Create the root `Makefile` with the specified targets. [d6b962c]
    - [x] Create `Makefile` in the project root.
    - [x] Define `.PHONY` targets for all commands to prevent conflict with files.
    - [x] Implement `setup` target: `aqua install -l && npm install`.
    - [x] Implement `gen` target: `buf generate && sqlc generate`.
    - [x] Implement `dev` target: `go run ./cmd/feed-reader`.
    - [x] Implement `frontend` target: `npm run dev`.
    - [x] Implement `test` target: `go test ./...`.
    - [x] Implement `lint` target: `golangci-lint run`.
    - [x] Implement `build` target: `go build -o dist/ ./cmd/...`.

### Task: Verification
- [x] Task: Verify each Makefile target manually. [0000000]
    - [x] Run `make setup` and ensure it completes without error.
    - [x] Run `make gen` and verify code is generated.
    - [x] Run `make test` and `make lint` to ensure Go tools are called correctly.
    - [x] Run `make build` and check for the `dist/` output.

- [x] Task: Conductor - User Manual Verification 'Phase 1: Foundation and Implementation' (Protocol in workflow.md) [4f1352a]
