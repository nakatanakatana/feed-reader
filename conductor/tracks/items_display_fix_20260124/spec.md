# Track Specification: items-display-fix

## Overview
Investigate and fix the issue where news items (items) are not displayed on the screen (both the Top page and individual Feed pages). Regression tests will be added to prevent future occurrences.

## Problem Statement
- **Symptoms**: The area where the list of articles should appear is empty or blank.
- **Affected Areas**: Top page (All items list) and individual Feed pages.
- **Potential Causes**:
    - Issues in data retrieval or RPC response in the backend (Go).
    - Issues in API calls, data mapping, or rendering in the frontend (React).

## Functional Requirements
- Article items must be correctly listed on both the Top page and individual Feed pages.
- If no data is available, an appropriate message (e.g., "No items found") should be displayed according to the existing design.

## Non-Functional Requirements
- **Quality**: Add automated tests (frontend, backend, or both) covering the fix to prevent regression.

## Acceptance Criteria
- [ ] Root cause identified through investigation.
- [ ] Article items are displayed on the Top page.
- [ ] Article items are displayed on individual Feed pages.
- [ ] Automated tests (Unit or Integration) verifying the fix are passing.

## Out of Scope
- Major UI/UX design changes.
- Improvements to the fetcher logic unrelated to the display issue.
