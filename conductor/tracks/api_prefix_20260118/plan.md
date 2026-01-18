# Implementation Plan - Move API endpoints under /api

## Phase 1: Backend Update [checkpoint: 1168c57]
- [x] Task: Create a reproduction test case to verify current routing behavior 5c3e8a9
- [x] Task: Update Backend Routing ca5ee3b
- [x] Task: Conductor - User Manual Verification 'Phase 1: Backend Update' (Protocol in workflow.md)

## Phase 2: Frontend & Tooling Update [checkpoint: 8a4d4f9]
- [x] Task: Update Frontend Transport 98a69b4
- [x] Task: Update Vite Configuration f26de3f
- [x] Task: Conductor - User Manual Verification 'Phase 2: Frontend & Tooling Update' (Protocol in workflow.md)

## Phase 3: Verification
- [x] Task: Manual Verification 70d29a6
    - [ ] Start backend and frontend servers.
    - [ ] Verify API calls in browser network tab show `/api` prefix.
    - [ ] Verify application functionality (List, Add, Delete feeds).
- [ ] Task: Conductor - User Manual Verification 'Phase 3: Verification' (Protocol in workflow.md)
