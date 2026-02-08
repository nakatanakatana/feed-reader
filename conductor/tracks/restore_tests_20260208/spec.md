# Specification: Refactor Frontend Tests and Restore Skipped Tests

## 1. Overview
The current frontend test suite heavily relies on mocking `tanstack/db` and other core logic, which reduces test reliability and makes maintenance difficult. This track aims to refactor the testing strategy to use MSW for network-level mocking while running actual application logic (including `tanstack/db`), and to restore critical tests that are currently skipped.

## 2. Functional Requirements
- **Mocking Strategy Refactoring:**
    - Replace heavy mocks of `@tanstack/db` and state management with MSW (Mock Service Worker).
    - Ensure tests interact with the actual implementation of `tanstack/db` where feasible.
- **Restore Skipped Tests:**
    - Enable and fix tests related to **Feed Management** (adding and updating feeds).
    - Enable and fix tests related to **Article Status Management** (read/unread toggles).
- **Test Infrastructure Improvement:**
    - Standardize the MSW setup across the frontend test suite.
    - Improve the clarity and maintainability of test data setup.

## 3. Non-Functional Requirements
- **Test Reliability:** Tests should reflect actual application behavior more closely by minimizing internal logic mocking.
- **Maintainability:** Reduce the boilerplate code required for mocking in individual test files.
- **Performance:** Ensure that running actual `tanstack/db` logic in tests does not significantly degrade test execution time.

## 4. Acceptance Criteria
- [ ] No frontend tests are marked as `skipped` without a valid, documented reason.
- [ ] `@tanstack/db` is no longer globally or heavily mocked in the restored tests.
- [ ] MSW is correctly configured and used for API responses in the target tests.
- [ ] All restored tests (Feed Management, Article Status) pass consistently in the CI environment.
- [ ] Test coverage for the refactored areas is at least maintained or improved.

## 5. Out of Scope
- Complete rewrite of the backend test suite (this track focuses on frontend).
- Introduction of new application features beyond what is required for testing.
- Migration away from `tanstack/db` itself (only the testing of it is changed).
