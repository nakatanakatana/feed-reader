# Track Specification: Remove testify/mock Dependency and Unify Testing Library

## Overview
Currently, the `store/retry_db_test.go` file depends on `github.com/stretchr/testify/mock`. This track aims to replace these mocks with hand-written mock structures, remove the dependency on the `testify` library entirely from the project, and ensure all backend tests are unified to use `gotest.tools/v3`.

## Functional Requirements
- **Replace Mocks**: Refactor `store/retry_db_test.go` to use hand-written mock implementations instead of `testify/mock`.
- **Remove Dependency**: Remove `github.com/stretchr/testify` from `go.mod` and `go.sum` after ensuring no other files use it.
- **Unify Testing Framework**: Ensure all backend tests consistently use `gotest.tools/v3` for assertions and comparisons, following the established project pattern.

## Non-Functional Requirements
- **Simplicity**: Prefer simple, explicit hand-written mocks over complex mocking frameworks or heavy boilerplate.
- **Consistency**: Adhere to the testing style guidelines defined in the project's workflow and existing refactored tests.

## Acceptance Criteria
- All backend tests pass successfully.
- `github.com/stretchr/testify` is completely removed from `go.mod`.
- `store/retry_db_test.go` uses simple hand-written mocks.
- All backend tests use `gotest.tools/v3` for assertions.
- No regressions in test coverage or logic.

## Out of Scope
- Introducing new mocking libraries or code generation tools.
- Modifying frontend tests.
