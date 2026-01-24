# Implementation Plan: Migrating Feed and Item State to TanStack DB

This plan outlines the steps to refactor the frontend state management for Feeds and Feed Items to use `@tanstack/db` integrated with TanStack Query.

## Phase 1: Foundation and Centralized DB Setup

- [x] **Task 1: Install Dependencies** (5dccf9f)
    - [ ] Install `@tanstack/db` and ensure `@tanstack/solid-query` is up to date.
- [x] **Task 2: Initialize TanStack DB** (e9aa7b3)
    - [ ] Create `frontend/src/lib/db.ts`.
    - [ ] Define the `Feed` and `Item` schemas.
    - [ ] Initialize the TanStack DB instance.
- [x] **Task 3: Define Collections with `queryCollection`** (e9aa7b3)
    - [ ] Define the `feeds` collection in `db.ts` using `queryCollection`.
    - [ ] Define the `items` collection in `db.ts` using `queryCollection`.
    - [ ] Implement the `queryFn` for both collections using the existing Connect-RPC services.
- [ ] **Task 4: Conductor - User Manual Verification 'Phase 1' (Protocol in workflow.md)**

## Phase 2: Refactoring Feed Management

- [ ] **Task 1: Refactor `FeedList` Component**
    - [ ] Replace `useQuery` with the `feeds` collection query.
    - [ ] Update delete logic to use the collection's write/sync methods.
- [ ] **Task 2: Refactor `AddFeedForm` Component**
    - [ ] Update form submission to use the `feeds` collection for adding new feeds.
- [ ] **Task 3: Refactor `feeds.$feedId.tsx` (Feed Detail)**
    - [ ] Update the single feed retrieval logic to use the local DB if possible or the collection query.
- [ ] **Task 4: Conductor - User Manual Verification 'Phase 2' (Protocol in workflow.md)**

## Phase 3: Refactoring Item Management

- [ ] **Task 1: Refactor `ItemList` Component**
    - [ ] Replace `useQuery` with the `items` collection query, filtered by `feedId`.
- [ ] **Task 2: Refactor Item Interactions**
    - [ ] If any item interactions (e.g., mark as read) exist, refactor them to use the `items` collection.
- [ ] **Task 3: Conductor - User Manual Verification 'Phase 3' (Protocol in workflow.md)**

## Phase 4: Verification and Cleanup

- [ ] **Task 1: Run Frontend Tests**
    - [ ] Execute `npm test` and ensure all tests pass.
    - [ ] Update any tests that rely on mocked TanStack Query calls if they break.
- [ ] **Task 2: Final Integration Check**
    - [ ] Verify manual end-to-end flow: Add feed -> List feeds -> View items -> Delete feed.
- [ ] **Task 3: Conductor - User Manual Verification 'Phase 4' (Protocol in workflow.md)**
