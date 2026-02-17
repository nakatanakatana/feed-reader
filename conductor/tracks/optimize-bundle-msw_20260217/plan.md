# Implementation Plan - Optimize Bundle Size by Excluding MSW

## Phase 1: Setup & Baseline Analysis
- [x] Task: Install and Configure Analyzer (fb739d3)
    - [x] Install `vite-bundle-analyzer` as a dev dependency (standard for Vite).
    - [x] Update `vite.config.js` to include the visualizer plugin conditionally (e.g., when `ANALYZE=true`).
    - [x] Add an `analyze` script to `package.json`.
- [x] Task: Baseline Measurement (fb739d3)
    - [x] Execute the analysis script.
    - [x] Record the current bundle size and the size contributed by `msw`. (865.31 kB, contains 'msw')
- [x] Task: Conductor - User Manual Verification 'Setup & Baseline Analysis' (Protocol in workflow.md) (2dd677d)

## Phase 2: Implementation (Conditional Loading)
- [x] Task: Refactor Entry Point for Dynamic Import (24cbd94)
    - [x] Modify `frontend/src/mocks/init.ts` (used by `main.tsx`) to remove the static import of the mock worker.
    - [x] Implement conditional logic using `import.meta.env.DEV` (or passed config).
    - [x] Use `import()` to dynamically load and start the worker only when mocks are enabled.
    - [x] Ensure the app rendering waits for the worker start (already handled by `initMocks` promise).
- [x] Task: Conductor - User Manual Verification 'Implementation (Conditional Loading)' (Protocol in workflow.md) (6a9cb29)

## Phase 3: Verification [checkpoint: 6a9cb29]
- [ ] Task: Verify Exclusion and Functionality
    - [ ] Run the analysis script again.
    - [ ] Confirm `msw` is absent from the production bundle.
    - [ ] Verify the application works correctly in production mode (build & preview).
    - [ ] Verify the application works correctly in development mode (with MSW).
- [ ] Task: Conductor - User Manual Verification 'Verification' (Protocol in workflow.md)