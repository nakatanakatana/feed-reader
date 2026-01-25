# Specification: Backend Database Write Retry Mechanism

## Overview
Currently, the backend application fails immediately if a database write operation encounters a lock conflict (common in SQLite). This track introduces a robust retry mechanism with exponential backoff specifically for SQLite "busy" errors across all database write operations to improve system resilience.

## Functional Requirements
- **Centralized Retry Logic:** Implement a reusable retry mechanism within the `store` package.
- **SQLite Busy Detection:** Automatically detect `SQLITE_BUSY` (database is locked) and `SQLITE_LOCKED` errors.
- **Exponential Backoff:** Use an exponential backoff strategy for wait times between retries.
- **Global Application:** Apply this retry logic to all database write/modification operations handled by the `store` package.

## Non-Functional Requirements
- **Performance:** Retries should be efficient and not block the system indefinitely.
- **Configurability:** Retry parameters (max attempts, base delay) should be clearly defined as constants or configuration.
- **Observability:** (Optional but recommended) Log retry attempts for debugging and monitoring purposes.

## Implementation Details (Retry Parameters)
- **Strategy:** Exponential Backoff
- **Max Retries:** 10 attempts
- **Initial Delay:** 10ms
- **Maximum Delay:** 100ms
- **Trigger:** Only `SQLITE_BUSY` and related transient lock errors.

## Acceptance Criteria
- [ ] Database write operations successfully retry when they encounter a `SQLITE_BUSY` error.
- [ ] The system gives up and returns the original error after 10 failed attempts.
- [ ] Wait times between attempts follow an exponential pattern.
- [ ] Non-lock related errors (e.g., schema violations, invalid data) do NOT trigger a retry and fail immediately.
- [ ] All write methods in the `store` package employ this retry mechanism.

## Out of Scope
- Implementing retries for Read operations (unless they are part of a write transaction).
- Modifying the underlying SQLite driver configuration (e.g., PRAGMA busy_timeout), as we want application-level control and observability.
