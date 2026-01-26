# Implementation Plan: Remove Unused Feed Routes and Modal Elements

## Phase 1: Preparation and Environment Check
- [ ] Task: Verify current project state and ensure tests pass.
- [ ] Task: Conductor - User Manual Verification 'Phase 1' (Protocol in workflow.md)

## Phase 2: Remove UI Elements and Update Components
- [ ] Task: Remove the close button (×) from ItemDetailModal.
    - [ ] Write failing test in `frontend/src/components/ItemDetailModal.test.tsx` to assert the "X" button is NOT present.
    - [ ] Remove the button and its associated logic from `frontend/src/components/ItemDetailModal.tsx`.
- [ ] Task: Remove navigation functionality from FeedList sidebar.
    - [ ] Write failing test in `frontend/src/components/FeedList.test.tsx` ensuring clicking a feed doesn't navigate.
    - [ ] Update `frontend/src/components/FeedList.tsx` to remove the `<Link>` or navigation wrapper around feed items.
- [ ] Task: Conductor - User Manual Verification 'Phase 2' (Protocol in workflow.md)

## Phase 3: Route Removal and Cleanup
- [ ] Task: Remove Feed-specific route files.
    - [ ] Delete `frontend/src/routes/feeds.$feedId.tsx`.
    - [ ] Delete `frontend/src/routes/feeds.$feedId.items.$itemId.tsx`.
- [ ] Task: Cleanup related tests and routing references.
    - [ ] Remove `frontend/src/routes_test/feeds.$feedId.test.tsx`.
    - [ ] Identify and remove any remaining references to these routes in other tests (e.g., `item_routing.test.tsx`).
    - [ ] Verify `frontend/src/routeTree.gen.ts` is updated after route file deletion.
- [ ] Task: Conductor - User Manual Verification 'Phase 3' (Protocol in workflow.md)

## Phase 4: Final Verification
- [ ] Task: Run all frontend tests to ensure no regressions.
- [ ] Task: Run full build and lint checks.
- [ ] Task: Conductor - User Manual Verification 'Phase 4' (Protocol in workflow.md)
