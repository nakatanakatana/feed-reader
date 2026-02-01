# Track Specification: Switch SQLite Driver to ncruces/go-sqlite3

## Overview
Currently, the backend experiences frequent `SQLite Busy` errors during parallel write operations. To resolve this, we will switch the SQLite driver from `modernc.org/sqlite` to `ncruces/go-sqlite3`, which is expected to provide better handling of concurrent access and improved performance.

## Functional Requirements
1. **Driver Replacement**:
   - Replace the `modernc.org/sqlite` import in `cmd/feed-reader/main.go` with `github.com/ncruces/go-sqlite3/driver` and `github.com/ncruces/go-sqlite3/embed`.
   - Update `sql.Open("sqlite", ...)` to use the driver name provided by `ncruces/go-sqlite3` (typically `sqlite3`).
2. **Dependency Update**:
   - Remove `modernc.org/sqlite` from `go.mod` and add `github.com/ncruces/go-sqlite3`.
3. **Verification**:
   - Run the existing test suite to ensure no regressions.
   - Manually verify the application by performing concurrent write operations to check if the `SQLite Busy` errors are resolved or significantly reduced.

## Non-Functional Requirements
- Reduce the frequency of `SQLite Busy` errors during parallel writes.
- Maintain a pure Go (CGO-free) configuration. `ncruces/go-sqlite3` provides a pure Go implementation using WASM.

## Constraints / Out of Scope
- Driver dependencies within `sql/migration.go` (related to `sqldef`) are out of scope for this track unless issues arise during verification.
- Additional PRAGMA settings (e.g., WAL mode) via DSN are considered a next step and will not be introduced in this track unless the driver switch alone is insufficient.

## Acceptance Criteria
- [ ] All existing tests pass.
- [ ] The application starts correctly and database operations (read/write) function as expected.
- [ ] `SQLite Busy` errors during parallel writes are resolved or significantly reduced.
