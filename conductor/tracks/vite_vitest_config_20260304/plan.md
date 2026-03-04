# Implementation Plan: Consolidate Vite/Vitest Configurations

## Overview
Consolidate fragmented Vite and Vitest configurations into a single `vite.config.js` at the root using the Vitest `projects` feature. This will enable running all tests (Browser and Node.js) with a single command and simplify configuration management.

## Phase 1: Consolidation [checkpoint: a59fe87]
- [x] Task: Update `vite.config.js` to include Vitest `projects`. [dc85c41]
    - Move configuration from `vitest.workspace.ts` and `frontend/vitest.node.config.js` into the `test.projects` array in `vite.config.js`.
    - Define a `browser` project and a `node` project.
    - Ensure global settings (coverage, reporters) are defined at the root level of `test`.
- [x] Task: Update `package.json` scripts. [c78fef8]
    - Simplify the `test` script to a single `vitest run` command.
- [x] Task: Conductor - User Manual Verification 'Phase 1: Consolidation' (Protocol in workflow.md) [a59fe87]

## Phase 2: Cleanup & Verification [checkpoint: 4fd55cd]
- [x] Task: Remove redundant configuration files. [fa5ecfd]
    - Delete `vitest.workspace.ts`.
    - Delete `frontend/vitest.node.config.js`.
- [x] Task: Verify test execution.
    - Run `npm test` and ensure both `browser` and `node` projects are executed and pass.
- [x] Task: Verify Vite build and dev.
    - Run `npm run build` and `npm run dev` to ensure no regression in build/dev functionality.
- [x] Task: Conductor - User Manual Verification 'Phase 2: Cleanup & Verification' (Protocol in workflow.md) [4fd55cd]
