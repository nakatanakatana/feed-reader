# Specification: Replace JSDOM with Vitest Browser Mode

## Overview
Currently, the frontend tests use `jsdom` to simulate the DOM environment. While functional, `jsdom` is an incomplete simulation and can lead to discrepancies between tests and real browser behavior. This track replaces `jsdom` with **Vitest Browser Mode** using **Playwright** and **Chromium** to run tests in a real browser environment, providing higher confidence and better support for modern web APIs.

## Functional Requirements
- **Test Runner Migration**: Update `vite.config.js` and Vitest configuration to use Browser Mode.
- **Provider Setup**: Configure `playwright` as the browser provider.
- **Environment Update**: Remove `jsdom` from the project dependencies and configuration.
- **Complete Migration**: All existing frontend tests (`.test.tsx`, `.test.ts`) must be updated to run successfully in the browser environment.
- **Headless Execution**: Ensure tests run headlessly by default (especially for CI environments).

## Non-Functional Requirements
- **Performance**: Monitor test execution time to ensure it remains acceptable compared to `jsdom`.
- **Reliability**: Reduce "flaky" tests that might have been caused by `jsdom` limitations.

## Acceptance Criteria
- [ ] `vitest` is configured with `browser` mode enabled.
- [ ] Playwright is installed and configured as the provider.
- [ ] Chromium is the target browser for test execution.
- [ ] `jsdom` dependency is removed from `package.json`.
- [ ] All existing frontend tests pass in the real browser environment.
- [ ] `npm test` (or equivalent command) runs the browser-based tests.

## Out of Scope
- Migrating to a different testing library (e.g., switching from `@solidjs/testing-library` to something else, unless necessary for browser mode compatibility).
- Adding new feature tests beyond migrating existing ones.
- Cross-browser testing beyond Chromium (unless issues are found that necessitate it).
