# Specification: Identify Minimal Changes for SQLite Transaction Error

## Overview
Verify if all measures introduced in the previous track to resolve SQLite transaction errors (`cannot start a transaction within a transaction` and `database is locked`) were necessary. Identify the minimal set of changes that completely resolves the issue using the reproduction database `fail.db`.

## Background
- **Errors Encountered**:
    - `failed to begin transaction: SQL logic error: cannot start a transaction within a transaction`
    - `database is locked (SQLITE_BUSY)`
- **Currently Applied Measures**:
    1. Refactored `WithTransaction` to propagate and reuse transactions via `context.Context`.
    2. Configured `main.go` with `WAL` mode, `busy_timeout`, and restricted `MaxOpenConns(1)`.
- **Reproduction Data**: `fail.db`, which represents the database state when errors were occurring.

## Goals
- Identify the minimal set of changes that prevents these errors under concurrent fetching operations.
- "Minimal set" is defined as the combination of changes with the smallest code diff compared to `origin/main` that results in zero transaction errors.

## Verification Matrix
Systematically test combinations of the following:
1. **`WithTransaction` refactoring**: Support for nested transactions via context.
2. **`main.go` configuration**:
    - `MaxOpenConns(1)`
    - `journal_mode(WAL)`
    - `busy_timeout(5000)`

## Acceptance Criteria
1. Zero transaction errors occur during high-concurrency feed fetching when using `fail.db`.
2. The implemented changes represent the minimum required modifications from `origin/main`.
3. All existing unit and integration tests pass without regression.
