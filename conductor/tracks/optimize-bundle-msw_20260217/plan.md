# Implementation Plan - Optimize Bundle Size by Excluding MSW

## Phase 1: Setup & Baseline Analysis
- [ ] Task: Install and Configure Analyzer
    - [ ] Install `rollup-plugin-visualizer` as a dev dependency (standard for Vite).
    - [ ] Update `vite.config.ts` to include the visualizer plugin conditionally (e.g., when `ANALYZE=true`).
    - [ ] Add an `analyze` script to `package.json`.
- [ ] Task: Baseline Measurement
    - [ ] Execute the analysis script.
    - [ ] Record the current bundle size and the size contributed by `msw`.
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