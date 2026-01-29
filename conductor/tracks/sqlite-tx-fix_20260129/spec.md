# Specification: Fix SQLite Transaction Error with modernc.org/sqlite

## Overview
After migrating the SQLite driver from `mattn/go-sqlite3` to `modernc.org/sqlite`, the following error occurs when saving items:
`failed to begin transaction: SQL logic error: cannot start a transaction within a transaction`

This track aims to investigate the root cause of this error and implement a fix to ensure stable operation with the `modernc.org/sqlite` driver.

## Phenomenon
- **Error Message**: `failed to begin transaction: SQL logic error: cannot start a transaction within a transaction`
- **Occurrence**: When saving items (occurs consistently or potentially during concurrent operations).
- **Reproduction**: The issue can be reproduced by running the application locally and adding or updating feeds.

## Goals
- Identify the specific code path causing the nested transaction attempt.
- Refactor the transaction control logic to prevent starting a transaction while another is already active, ensuring compatibility with `modernc.org/sqlite`.
- Confirm that items are saved correctly and no error logs are generated after the fix.

## Acceptance Criteria
1. The "cannot start a transaction within a transaction" error no longer occurs during local application execution.
2. Feed items are successfully persisted to the database.
3. All existing tests pass without regression.
