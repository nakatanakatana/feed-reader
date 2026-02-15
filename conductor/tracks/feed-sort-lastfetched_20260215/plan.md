# Plan: Feed Sort by Last Fetched

## Phase 1: Test & Implementation

- [ ] Task: Create a reproduction/test case for the new sorting logic
    - [ ] Create `frontend/src/components/FeedList.Sorting.test.tsx` (or update if exists)
    - [ ] Add a test case that renders `FeedList` with a mocked list of feeds having various `lastFetchedAt` values (including undefined/null).
    - [ ] Verify that selecting "Last Fetched" sorts them correctly (undefined first, then oldest to newest).
    - [ ] Verify that secondary sorting by title works for feeds with same/missing dates.

- [ ] Task: Implement Sorting Logic in `FeedList.tsx`
    - [ ] Update the `sortBy` signal/state to accept a new value (e.g., `last_fetched`).
    - [ ] Add the `<option value="last_fetched">Last Fetched</option>` to the sort dropdown.
    - [ ] Modify the `feedListQuery` logic to handle the `last_fetched` sort key.
        - [ ] Implement the logic: `orderBy(({ feed }) => feed.lastFetchedAt, "asc")` (or equivalent custom sorting if the DB adapter requires specific handling for nulls first).
        - [ ] Ensure the tie-breaker (Title ASC) is applied.

- [ ] Task: Conductor - User Manual Verification 'Test & Implementation' (Protocol in workflow.md)
