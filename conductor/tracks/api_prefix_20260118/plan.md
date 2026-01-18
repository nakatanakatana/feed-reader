# Implementation Plan - Move API endpoints under /api

## Phase 1: Backend Update [checkpoint: 1168c57]
- [x] Task: Create a reproduction test case to verify current routing behavior 5c3e8a9
- [x] Task: Update Backend Routing ca5ee3b
- [x] Task: Conductor - User Manual Verification 'Phase 1: Backend Update' (Protocol in workflow.md)

## Phase 2: Frontend & Tooling Update
- [x] Task: Update Frontend Transport 98a69b4
    - [ ] Update `frontend/src/lib/query.ts` to set `baseUrl` to `/api`.
    - [ ] Verify frontend tests pass.
- [ ] Task: Update Vite Configuration
    - [ ] Update `vite.config.js` to proxy `/api` requests to the backend `http://localhost:8080`.
- [ ] Task: Conductor - User Manual Verification 'Phase 2: Frontend & Tooling Update' (Protocol in workflow.md)

## Phase 3: Verification
- [ ] Task: Manual Verification
    - [ ] Start backend and frontend servers.
    - [ ] Verify API calls in browser network tab show `/api` prefix.
    - [ ] Verify application functionality (List, Add, Delete feeds).
- [ ] Task: Conductor - User Manual Verification 'Phase 3: Verification' (Protocol in workflow.md)
