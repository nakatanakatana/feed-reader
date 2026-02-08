# Track Specification: Unify Backend Testing with gotest.tools

## Overview
Currently, the backend test suite uses a mix of standard `testing` package assertions, custom golden file implementations, and some instances of `gotest.tools/v3/golden`. This track aims to unify the backend testing library to `gotest.tools` (v3) to improve readability, maintainability, and error reporting across all backend packages.

## Functional Requirements
- **Unify Assertions**: Replace verbose `if err != nil { t.Errorf(...) }` or `t.Fatalf(...)` patterns with `assert.NilError(t, err)`, `assert.Equal(t, ...)` and `assert.Check(t, ...)`.
- **Improve Comparison Logic**: Utilize the `cmp` package for deep comparisons of structs and slices to provide clear diffs upon failure.
- **Integrate Golden Tests**: Migrate existing custom golden file logic to `gotest.tools/v3/golden`.
- **Full Coverage**: Apply these changes to all backend packages, including `cmd/feed-reader/`, `store/`, and `sql/`.

## Non-Functional Requirements
- **Readability**: Reduce boilerplate in test code to make the intent of tests clearer.
- **Consistency**: Establish a uniform testing style across the entire Go codebase.

## Acceptance Criteria
- All existing backend tests pass successfully.
- Redundant error checking patterns (e.g., `if err != nil`) are refactored to use `gotest.tools` helpers.
- Custom golden file comparison logic is replaced with `golden.Assert`.
- No regressions are introduced in the existing test logic.

## Out of Scope
- Adding new test cases (the focus is on refactoring existing ones).
- Modifying frontend tests (TypeScript/Vitest).
