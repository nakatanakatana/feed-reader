# Specification: Introduction of Snapshot Testing (Golden Testing)

## Overview
To improve test stability and simplify tracking of changes, we will introduce snapshot testing (golden testing) to both the backend and frontend. By saving and comparing complex data such as HTML conversion results, API responses, and DOM structures as external files, we aim to efficiently detect unintended regressions.

## Goals
- Reduce redundant assertions of expected values in test code.
- Easily detect and update changes in complex data (HTML conversion results, API responses, DOM structures).
- Introduce `gotest.tools/v3/golden` as a foundation for standardizing backend test utilities.

## Scope

### 1. Backend (Go)
- **Tool:** `gotest.tools/v3`
- **Targets:**
    - `converter_test.go`: Verification of HTML to Markdown conversion results.
    - `handler_test.go`: Verification of Connect RPC API responses (JSON).
- **Future Consideration:** Consider gradually integrating other test utilities into `gotest.tools`.

### 2. Frontend (SolidJS)
- **Tool:** `Vitest` (existing snapshot functionality)
- **Format:** External snapshot files (`__snapshots__/*.snap`)
- **Targets:**
    - `frontend/src/components/*.test.tsx`: UI component rendering results.
    - Verification of API mock data and large data objects.

## Functional Requirements
- **Update Snapshots:** Must be able to update expected values with a single command (e.g., `go test -update`, `vitest -u`).
- **Diff Visualization:** Differences between current and expected values must be clearly displayed upon test failure.
- **CI Integration:** Tests must fail in CI (GitHub Actions) if snapshots do not match.

## Non-Functional Requirements
- **Reproducibility:** Dynamic values such as timestamps or random IDs must be masked or replaced with fixed values before snapshotting.
- **Portability:** Snapshot files must be committed to the repository and shared among developers.

## Acceptance Criteria
- [ ] `gotest.tools/v3` is introduced to the Go project.
- [ ] Primary test cases in `converter_test.go` are refactored to use `golden.Assert`.
- [ ] Major API response validations in `handler_test.go` are snapshotted.
- [ ] Snapshot tests using `toMatchSnapshot()` are added to key frontend components (e.g., `FeedList`, `ItemRow`).
- [ ] Commands for updating snapshots are organized in `Makefile` or confirmed to be supported by existing commands.

## Out of Scope
- Mass replacement of all existing tests (this track focuses on representative areas).
- Introduction of Image Snapshots (Visual Regression Testing).
