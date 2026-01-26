# Implementation Plan: Rename Feed columns (uuid -> id, language -> lang)

This plan outlines the steps to refactor the application code to match the renamed columns in the `feeds` table.

## Phase 1: Go Backend Refactoring [checkpoint: 529e3b7]
Refactor the Go backend code to use the new field names `Id` and `Lang`.

- [x] Task: Refactor `store/` package to use new `sqlc` field names a4c60da
- [x] Task: Refactor `cmd/feed-reader/` package (services and handlers) to use new field names a4c60da
- [x] Task: Update all backend tests in `store/` and `cmd/feed-reader/` a4c60da
- [x] Task: Verify backend builds and all tests pass (`go test ./...`) a4c60da
- [x] Task: Conductor - User Manual Verification 'Go Backend Refactoring' (Protocol in workflow.md) 529e3b7

## Phase 2: TypeScript Frontend Refactoring [checkpoint: 42a7ef7]
Refactor the TypeScript frontend code to use the new property names `id` and `lang`.

- [x] Task: Refactor frontend library and query files (`frontend/src/lib/`, `frontend/src/mocks/`) 68386f9
- [x] Task: Refactor frontend components and routes (`frontend/src/components/`, `frontend/src/routes/`) 7a85977
- [x] Task: Update all frontend tests (Vitest) 540654f
- [x] Task: Verify frontend builds and all tests pass (`npm run test`) cf87272
- [x] Task: Conductor - User Manual Verification 'TypeScript Frontend Refactoring' (Protocol in workflow.md) 42a7ef7

## Phase 3: Final Verification and Cleanup [checkpoint: 9e4ab7e]
Ensure consistency across the entire codebase.

- [x] Task: Run all project-wide checks (linting, formatting, full build) 73c1523
- [x] Task: Conductor - User Manual Verification 'Final Verification and Cleanup' (Protocol in workflow.md) 9e4ab7e
