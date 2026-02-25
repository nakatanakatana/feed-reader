# Implementation Plan: Cleanup Unused Code

## Phase 1: Research & Identification [checkpoint: cb3ad75]
This phase focuses on identifying candidates for deletion across the backend and frontend.

- [x] Task: Backend: Run `golangci-lint` with `unused` and `deadcode` to identify unused Go symbols.
- [x] Task: Frontend: Run `vite-bundle-analyzer` and Biome linting to find unused components and modules.
- [x] Task: Manual Audit: Review `routeTree.gen.ts` and API handlers for unreachable endpoints.
- [x] Task: Coverage Analysis: Check Go and Vitest coverage reports for 0% coverage areas.
- [x] Task: Conductor - User Manual Verification 'Research & Identification' (Protocol in workflow.md)

## Phase 2: Backend Cleanup [checkpoint: 6b0b857]
Surgical removal of confirmed unused code in the Go backend.

- [x] Task: Remove unused functions, variables, and types identified in Phase 1.
- [x] Task: Run `go test ./...` to ensure no regressions in existing logic.
- [x] Task: Conductor - User Manual Verification 'Backend Cleanup' (Protocol in workflow.md)

## Phase 3: Frontend Cleanup [checkpoint: be7d25f]
Surgical removal of confirmed unused code in the SolidJS frontend.

- [x] Task: Remove unused components, styles (Panda CSS), and hooks.
- [x] Task: Run `npm test` to ensure no regressions in existing UI components.
- [x] Task: Conductor - User Manual Verification 'Frontend Cleanup' (Protocol in workflow.md)

## Phase 4: Dependency & Final Polish
Cleaning up project configuration and verifying the final state.

- [ ] Task: Run `go mod tidy` to remove unused Go dependencies.
- [ ] Task: Run `npm prune` and verify `package.json` for unused packages.
- [ ] Task: Perform a full system build and manual smoke test.
- [ ] Task: Conductor - User Manual Verification 'Dependency & Final Polish' (Protocol in workflow.md)
