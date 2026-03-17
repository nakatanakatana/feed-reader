## Context

The application currently has several UI settings that control how data is displayed:

- **Feeds Management Screen (`/feeds`)**: Sort order (`sortBy`) and Tag filter (`selectedTagId`).

These settings are currently transient and lost upon page refresh or app restart.

## Goals / Non-Goals

**Goals:**

- Persist `sortBy` and `selectedTagId` for the Feeds Management screen.
- Ensure settings are restored automatically when the user returns to the app.

**Non-Goals:**

- Syncing these settings across devices (out of scope, local storage is browser-specific).
- Persisting temporary UI states like modal open/close status or scroll position.
- Persisting Article List filters (already handled via URL parameters).

## Decisions

### 1. Storage Mechanism: `localStorage`

- **Rationale**: `localStorage` is simple, synchronous, and widely supported for small configuration data. Since these are UI preferences, they don't need to be in the main database.

### 2. Implementation Strategy: Unified Storage Utility

- We created a utility `storage-utils.ts` to handle reading/writing these settings to `localStorage`.
- We moved the Feed List state from internal component signals to a new `feedStore` for better management and persistence integration.
- We used `createEffect` and `ref` in `FeedList.tsx` to ensure DOM synchronization, especially when options are loaded asynchronously.

### 3. Key Names for Local Storage

- `feed-reader:settings:feed-sort-by`
- `feed-reader:settings:feed-tag-filter`

## Risks / Trade-offs

- **[Risk]** Invalid data in `localStorage` could crash the app.
  - **Mitigation**: Use a defensive "get" utility that validates data against expected values/types and falls back to defaults.
- **[Risk]** `localStorage` not available (e.g., Private Browsing in some environments).
  - **Mitigation**: Wrap storage calls in try-catch and fail gracefully (stay transient).
- **[Risk]** UI Desync on load.
  - **Mitigation**: Use manual `ref` synchronization in `FeedList.tsx` to ensure the `<select>` value matches the store even if tags load after the initial mount.
