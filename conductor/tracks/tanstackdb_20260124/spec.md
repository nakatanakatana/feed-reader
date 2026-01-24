# Specification: Migrating Feed and Item State to TanStack DB

This track involves refactoring the frontend state management for Feeds and Feed Items to use `@tanstack/db` integrated with TanStack Query via the `queryCollection` pattern.

## Overview
Currently, the application uses `@tanstack/solid-query` directly in components to fetch and manage Feeds and Items. We want to move this logic into a centralized TanStack DB configuration to benefit from local caching, automatic synchronization, and a more structured data layer.

## Functional Requirements
- **Centralized DB Setup**: Create a centralized database configuration using `@tanstack/db`.
- **Feed Collection**: Define a `feeds` collection that uses `queryCollection` to sync with the `FeedService.listFeeds` endpoint.
- **Item Collection**: Define an `items` collection that uses `queryCollection` to sync with the `ItemService.listItems` (or equivalent) endpoint.
- **Component Refactoring**:
    - Update `FeedList` to use the `feeds` collection for querying and mutations.
    - Update `ItemList` (and related components) to use the `items` collection, filtering by `feedId`.
    - Update `AddFeedForm` and delete actions to interact with the collection/sync store.
- **TanStack Query Integration**: Ensure the `queryCollection` is correctly wired up to the existing `queryClient`.

## Non-Functional Requirements
- **Solid.js Compatibility**: Ensure all changes are compatible with the existing Solid.js framework and `@tanstack/solid-query`.
- **Minimal UX regression**: Synchronization behavior should remain reliable.

## Acceptance Criteria
- [ ] `frontend/src/lib/db.ts` exists and contains the database and collection definitions.
- [ ] `FeedList.tsx` retrieves data from the TanStack DB collection instead of calling `useQuery` with a manual `queryFn`.
- [ ] Adding or deleting a Feed via the UI correctly updates the local DB and synchronizes with the server.
- [ ] `ItemList.tsx` retrieves data from the `items` collection filtered by the relevant `feedId`.
- [ ] The application remains functional and passes existing frontend tests (after updating them to the new data flow).

## Out of Scope
- **Optimistic Updates**: We will rely on server synchronization rather than manual optimistic UI updates for this track.
- **Offline Persistence**: While TanStack DB supports it, we are focusing on the `queryCollection` sync pattern for now.
