# Implementation Plan - Move API endpoints under /api

## Phase 1: Backend Update
- [x] Task: Create a reproduction test case to verify current routing behavior 5c3e8a9
    - [ ] Create `cmd/feed-reader/routing_test.go` to test that handlers respond on root paths currently.
- [ ] Task: Update Backend Routing
    - [ ] Modify `cmd/feed-reader/main.go` to wrap the existing handler with `http.StripPrefix("/api", handler)` and mount it at `/api/`.
    - [ ] Update `cmd/feed-reader/routing_test.go` to verify that handlers now respond on `/api` prefixed paths and return 404 on root paths.
- [ ] Task: Conductor - User Manual Verification 'Phase 1: Backend Update' (Protocol in workflow.md)

## Phase 2: Frontend & Tooling Update
- [ ] Task: Update Frontend Transport
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
