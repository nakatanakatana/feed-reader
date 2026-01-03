# Plan: Introduce MSW for Frontend API Mocking

## Phase 1: Dependency and Basic Configuration
- [x] Task: Install `msw` as a dev dependency. [91bdf5e]
- [ ] Task: Initialize MSW by running `npx msw init public/ --save`.
- [ ] Task: Create basic directory structure for MSW handlers and configuration (e.g., `frontend/src/mocks/`).
- [ ] Task: Implement a "mock initialization" utility that conditionally starts the MSW worker based on `VITE_USE_MOCKS`.
- [ ] Task: Conductor - User Manual Verification 'Phase 1: Dependency and Basic Configuration' (Protocol in workflow.md)

## Phase 2: FeedService Mock Implementation
- [ ] Task: Create `FeedService` mock handlers (`listFeeds`, `createFeed`, `deleteFeed`) using MSW's `http` and Connect RPC compatible logic.
- [ ] Task: Integrate `FeedService` handlers into the primary MSW worker configuration.
- [ ] Task: Verify that local development server logs MSW activation when `VITE_USE_MOCKS=true`.
- [ ] Task: Conductor - User Manual Verification 'Phase 2: FeedService Mock Implementation' (Protocol in workflow.md)

## Phase 3: Vitest Integration
- [ ] Task: Update `frontend/src/vitest-setup.ts` to start/stop the MSW server during test execution.
- [ ] Task: Create a test case that verifies API interception by MSW in the Vitest environment.
- [ ] Task: (Optional) Refactor one existing test to use MSW instead of manual transport mocks to verify integration.
- [ ] Task: Conductor - User Manual Verification 'Phase 3: Vitest Integration' (Protocol in workflow.md)

## Phase 4: Finalization
- [ ] Task: Audit codebase for any remaining hardcoded mock data that can be replaced by MSW.
- [ ] Task: Ensure all existing frontend tests pass with the new MSW integration.
- [ ] Task: Conductor - User Manual Verification 'Phase 4: Finalization' (Protocol in workflow.md)
