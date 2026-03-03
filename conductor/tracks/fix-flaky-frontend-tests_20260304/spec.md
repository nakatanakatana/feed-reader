# Track: Fix Flaky Frontend Tests

## Overview
This track addresses the flakiness observed in the frontend test suite, specifically in `frontend/src/components/ItemDetailModal.ImageLayout.test.tsx`. CI runs have shown failures with errors like `expect(element).toHaveStyle() Expected styles could not be parsed by the browser` and `Matcher did not succeed in time.`, suggesting timing or rendering issues in the Vitest Browser Mode tests.

## Functional Requirements
- **Fix Flakiness in `ItemDetailModal.ImageLayout.test.tsx`:** 
    - Investigate why `toHaveStyle` is failing at lines 209 and 243.
    - Implement a fix to ensure the tests pass consistently, likely by adjusting timeouts, ensuring elements are fully rendered/styled before assertion, or refining the style-based expectations.
- **Scan and Fix Similar Patterns:**
    - Identify other tests in the `frontend` suite that use `toHaveStyle` or similar layout-dependent assertions that might be susceptible to flakiness.
    - Apply similar stability improvements to those tests.

## Non-Functional Requirements
- **Test Reliability:** Frontend integration tests must be resilient to minor variations in browser rendering speed or timing.
- **Maintainability:** Fixes should follow the established testing patterns and not introduce overly complex waiting logic.

## Acceptance Criteria
- `frontend/src/components/ItemDetailModal.ImageLayout.test.tsx` passes consistently in both local and CI environments (multiple consecutive runs).
- Any other identified flaky tests with similar patterns are also fixed and passing consistently.
- All other frontend tests continue to pass.

## Out of Scope
- Major refactoring of the `ItemDetailModal` component's CSS or layout logic, unless absolutely necessary to resolve the flakiness.
- Backend test flakiness or performance improvements.
