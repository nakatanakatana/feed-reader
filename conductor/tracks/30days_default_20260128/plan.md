# Implementation Plan - Set Default Date Range to 30 Days

This plan outlines the steps to change the default date filter to "30 Days" for the main item list and synchronize this state with the URL.

## Phase 1: Search Parameter Synchronization
Support `publishedSince` in URL search parameters and synchronize it with the `ItemList` component.

- [x] Task: Update `_items` layout route (`frontend/src/routes/_items.tsx`) to validate and include `publishedSince` in search parameters. [f30ff25]
- [x] Task: Update `ItemList` component (`frontend/src/components/ItemList.tsx`) to accept `dateFilter` as an optional prop and use it to initialize or override its internal state. [84a9ef9]
- [x] Task: Synchronize `ItemList` internal `dateFilter` changes with the URL search parameters using `navigate`. [411de16]
- [ ] Task: Conductor - User Manual Verification 'Search Parameter Synchronization' (Protocol in workflow.md)

## Phase 2: Default Value Configuration [checkpoint: 2e303c3]
Configure the main item list to use "30 Days" as the default when no parameter is present.

- [x] Task: Set the default value for `publishedSince` to `"30d"` in the `_items` route validation logic. [534b01e]
- [x] Task: Ensure that individual feed routes (`frontend/src/routes/feeds.$feedId.tsx`) and tag filters continue to default to `"all"` unless explicitly changed. [18214aa]
- [x] Task: Conductor - User Manual Verification 'Default Value Configuration' (Protocol in workflow.md) [2e303c3]

## Phase 3: Verification and Cleanup
Verify the behavior across different views and ensure TDD requirements are met.

- [ ] Task: Add/Update tests in `frontend/src/components/ItemList.test.tsx` and `frontend/src/routes_test/item_routing.test.tsx` to verify default behavior and URL synchronization.
- [ ] Task: Verify that browser back/forward buttons correctly update the UI filter state.
- [ ] Task: Conductor - User Manual Verification 'Verification and Cleanup' (Protocol in workflow.md)
