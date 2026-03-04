# Specification: Consolidate Vite/Vitest Configurations

## Overview
This track aims to consolidate the existing fragmented Vite and Vitest configurations into a single, unified `vite.config.js` file at the root of the project. We will leverage [Vitest Projects](https://vitest.dev/guide/projects) to manage multiple testing environments (Node.js and Browser/Playwright) within this single configuration. This will simplify project maintenance and ensure that all tests can be executed via a single command.

## Functional Requirements
- **Unified Configuration:**
    - Create/Update a single `vite.config.js` at the root that serves as the entry point for both Vite (build/dev) and Vitest (test).
    - Use `defineConfig` from `vitest/config` to support both Vite and Vitest options.
- **Vitest Projects Support:**
    - Define multiple test projects within the root configuration:
        - **Node.js Project:** For backend-related logic, utility tests, and general Node.js testing.
        - **Browser Project:** For frontend component tests requiring a browser environment (using Playwright as the provider).
- **Frontend Path Resolution:**
    - Adjust the Vite configuration's `root` or `base` paths to correctly reference `frontend/index.html` and related assets when serving/building from the project root.
- **Redundant Config Cleanup:**
    - Remove the following files after successful consolidation:
        - `vitest.workspace.ts`
        - `frontend/vitest.node.config.js`
- **Execution:**
    - Ensure that running `npm test` (or the equivalent test command) triggers all tests across all defined projects.

## Non-Functional Requirements
- **Maintainability:** A single source of truth for all build and test configurations.
- **Performance:** Ensure that the consolidated configuration does not negatively impact build or test execution times.
- **Consistency:** Align the configuration with the project's existing tech stack (SolidJS, Vitest, Playwright, etc.).

## Acceptance Criteria
- [ ] A single `vite.config.js` exists at the root.
- [ ] `vitest.workspace.ts` is removed.
- [ ] `frontend/vitest.node.config.js` is removed.
- [ ] The command `npm test` runs both Node.js and Browser tests successfully.
- [ ] Frontend assets are correctly served/built from the root configuration.
- [ ] No regression in existing test coverage or build functionality.

## Out of Scope
- Migrating backend tests (Go) to Vitest (not applicable here).
- Changing the underlying testing frameworks (Vitest, Playwright, etc.).
- Modifying the production deployment infrastructure (Docker, etc.), unless configuration paths require adjustment.
