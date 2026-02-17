# Implementation Plan - Optimize Bundle Size by Excluding MSW

## Phase 1: Setup & Baseline Analysis
- [x] Task: Install and Configure Analyzer (d4585c5)
    - [x] Install `vite-bundle-analyzer` as a dev dependency (standard for Vite).
    - [x] Update `vite.config.js` to include the visualizer plugin conditionally (e.g., when `ANALYZE=true`).
    - [x] Add an `analyze` script to `package.json`.
- [x] Task: Baseline Measurement (d4585c5)
    - [x] Execute the analysis script.
    - [x] Record the current bundle size and the size contributed by `msw`. (865.31 kB, contains 'msw')
- [ ] Task: Conductor - User Manual Verification 'Setup & Baseline Analysis' (Protocol in workflow.md)

## Phase 2: Implementation (Conditional Loading)
- [ ] Task: Refactor Entry Point for Dynamic Import
    - [ ] Modify `frontend/src/main.tsx` to remove the static import of the mock worker.
    - [ ] Implement conditional logic using `import.meta.env.DEV`.
    - [ ] Use `import()` to dynamically load and start the worker only in development.
    - [ ] Ensure the app rendering waits for the worker start in dev mode.
- [ ] Task: Conductor - User Manual Verification 'Implementation (Conditional Loading)' (Protocol in workflow.md)

## Phase 3: Verification
- [ ] Task: Verify Exclusion and Functionality
    - [ ] Run the analysis script again.
    - [ ] Confirm `msw` is absent from the production bundle.
    - [ ] Verify the application works correctly in production mode (build & preview).
    - [ ] Verify the application works correctly in development mode (with MSW).
- [ ] Task: Conductor - User Manual Verification 'Verification' (Protocol in workflow.md)