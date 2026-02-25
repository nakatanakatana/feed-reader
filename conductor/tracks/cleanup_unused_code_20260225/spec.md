# Specification: Cleanup Unused Code

## Overview
This track aims to identify, verify, and remove unused code across the entire codebase (frontend and backend). Reducing dead code improves maintainability, simplifies future refactoring, and can optimize build times and bundle sizes.

## Scope
- **Backend (Go):**
    - Unused functions, variables, constants, and types.
    - Unreachable API endpoints or internal logic paths.
    - Unused dependencies in `go.mod`.
- **Frontend (SolidJS):**
    - Unused components, hooks, and utility functions.
    - Dead CSS/Panda CSS styles.
    - Unreachable routes in TanStack Router.
    - Unused dependencies in `package.json`.

## Identification Methods
- **Static Analysis:**
    - Backend: Use `golangci-lint` (with `unused`, `deadcode` linters).
    - Frontend: Use Biome linting and `vite-bundle-analyzer` to find un-imported modules.
- **Manual Audit:**
    - Review logic paths, especially around older features or aborted refactors.
- **Test Coverage Analysis:**
    - Identify code blocks with 0% coverage and investigate if they are reachable.

## Acceptance Criteria
- [x] A list of candidates for deletion is generated and reviewed.
- [ ] All confirmed unused code is safely removed.
- [ ] The application builds and all existing tests pass after removal.
- [ ] No regressions are introduced in existing features.
- [ ] `go mod tidy` and `npm prune` (or equivalent) are run to clean up dependencies.

## Out of Scope
- Major architectural refactoring (unless necessary for code removal).
- Optimization of *used* code.
- Functional changes or new features.

## Process: Review & Prune
1.  **Analysis Phase:** Run tools and perform manual audits to list "Candidates for Deletion".
2.  **Verification Phase:** Confirm each candidate is truly unused (considering dynamic calls or reflection if any).
3.  **Removal Phase:** Delete confirmed code and verify the system integrity.
