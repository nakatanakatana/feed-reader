# Specification: Introduce MSW for Frontend API Mocking

## Overview
This track introduces **Mock Service Worker (MSW)** to the frontend to allow for standalone development and testing without requiring a running backend. MSW will intercept API requests (Connect RPC) at the network level and return mocked responses.

## Functional Requirements
- **Integration**: Install and configure `msw` for both the browser (local development) and the Vitest Browser Mode environment.
- **Conditional Activation**:
    - In development mode, MSW should only start if the environment variable `VITE_USE_MOCKS` is set to `true`.
    - In testing mode (Vitest), MSW should be integrated to provide default handlers for all tests.
- **Service Mocking**: Implement mock handlers for the `FeedService`:
    - `listFeeds`: Return a predefined list of feeds.
    - `createFeed`: Simulate feed creation (e.g., adding to an in-memory list).
    - `deleteFeed`: Simulate feed deletion.
- **Connect RPC Compatibility**: Ensure mock handlers correctly handle the Connect RPC protocol (JSON/Protobuf over HTTP).

## Non-Functional Requirements
- **Type Safety**: Use the generated TypeScript types from the Protobuf definitions to ensure mock data matches the API contract.
- **Developer Experience**: Provide clear logs when MSW is active and intercepting requests.

## Acceptance Criteria
- [ ] `msw` dependency is added to `frontend/package.json`.
- [ ] MSW worker script is generated and placed in the public directory.
- [ ] Local development server (`npm run dev`) serves mocked data when `VITE_USE_MOCKS=true`.
- [ ] Vitest Browser Mode tests successfully use MSW handlers instead of manual transport mocks where applicable (or as an alternative option).
- [ ] Mocked `FeedService` methods behave as expected (List, Create, Delete).

## Out of Scope
- Mocking services other than `FeedService` in this initial track.
- Persistent mock data storage (in-memory is sufficient).
