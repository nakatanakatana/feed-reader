# Implementation Plan: Rename Feed columns (uuid -> id, language -> lang)

This plan outlines the steps to refactor the application code to match the renamed columns in the `feeds` table.

## Phase 1: Go Backend Refactoring
Refactor the Go backend code to use the new field names `Id` and `Lang`.

- [~] Task: Refactor `store/` package to use new `sqlc` field names
- [~] Task: Refactor `cmd/feed-reader/` package (services and handlers) to use new field names
- [~] Task: Update all backend tests in `store/` and `cmd/feed-reader/`
- [ ] Task: Verify backend builds and all tests pass (`go test ./...`)
- [ ] Task: Conductor - User Manual Verification 'Go Backend Refactoring' (Protocol in workflow.md)

## Phase 2: TypeScript Frontend Refactoring
Refactor the TypeScript frontend code to use the new property names `id` and `lang`.

- [ ] Task: Refactor frontend library and query files (`frontend/src/lib/`, `frontend/src/mocks/`)
- [ ] Task: Refactor frontend components and routes (`frontend/src/components/`, `frontend/src/routes/`)
- [ ] Task: Update all frontend tests (Vitest)
- [ ] Task: Verify frontend builds and all tests pass (`npm run test`)
- [ ] Task: Conductor - User Manual Verification 'TypeScript Frontend Refactoring' (Protocol in workflow.md)

## Phase 3: Final Verification and Cleanup
Ensure consistency across the entire codebase.

- [ ] Task: Run all project-wide checks (linting, formatting, full build)
- [ ] Task: Conductor - User Manual Verification 'Final Verification and Cleanup' (Protocol in workflow.md)
