# Plan: Introduce MSW for Frontend API Mocking

## Phase 1: Dependency and Basic Configuration [checkpoint: f2cd631]
- [x] Task: Install `msw` as a dev dependency. [91bdf5e]
- [x] Task: Initialize MSW by running `npx msw init public/ --save`. [ba53b8a]
- [x] Task: Create basic directory structure for MSW handlers and configuration (e.g., `frontend/src/mocks/`). [1c6e7fb]
- [x] Task: Implement a "mock initialization" utility that conditionally starts the MSW worker based on `VITE_USE_MOCKS`. [50d2239]
- [x] Task: Conductor - User Manual Verification 'Phase 1: Dependency and Basic Configuration' (Protocol in workflow.md)

## Phase 2: FeedService Mock Implementation [checkpoint: f697559]
- [x] Task: Create `FeedService` mock handlers (`listFeeds`, `createFeed`, `deleteFeed`) using MSW's `http` and Connect RPC compatible logic. [2694e5e]
- [x] Task: Integrate `FeedService` handlers into the primary MSW worker configuration. [c623dbc]
- [x] Task: Verify that local development server logs MSW activation when `VITE_USE_MOCKS=true`. [c623dbc]
- [x] Task: Conductor - User Manual Verification 'Phase 2: FeedService Mock Implementation' (Protocol in workflow.md)

## Phase 3: Vitest Integration
- [x] Task: Update `frontend/src/vitest-setup.ts` to start/stop the MSW server during test execution. [f2cd631]
- [x] Task: Create a test case that verifies API interception by MSW in the Vitest environment. [a6ed656]
- [x] Task: (Optional) Refactor one existing test to use MSW instead of manual transport mocks to verify integration. [12bb06c]
- [ ] Task: Conductor - User Manual Verification 'Phase 3: Vitest Integration' (Protocol in workflow.md)

## Phase 4: Finalization
- [ ] Task: Audit codebase for any remaining hardcoded mock data that can be replaced by MSW.
- [ ] Task: Ensure all existing frontend tests pass with the new MSW integration.
- [ ] Task: Conductor - User Manual Verification 'Phase 4: Finalization' (Protocol in workflow.md)
