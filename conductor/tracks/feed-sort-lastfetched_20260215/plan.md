# Plan: Feed Sort by Last Fetched

## Phase 1: Test & Implementation [checkpoint: 81ee6b4]

- [x] Task: Create a reproduction/test case for the new sorting logic [184b662]
    - [x] Create `frontend/src/components/FeedList.Sorting.test.tsx` (or update if exists)
    - [x] Add a test case that renders `FeedList` with a mocked list of feeds having various `lastFetchedAt` values (including undefined/null).
    - [x] Verify that selecting "Last Fetched" sorts them correctly (undefined first, then oldest to newest).
    - [x] Verify that secondary sorting by title works for feeds with same/missing dates.

- [x] Task: Implement Sorting Logic in `FeedList.tsx` [184b662]
    - [x] Update the `sortBy` signal/state to accept a new value (e.g., `last_fetched`).
    - [x] Add the `<option value="last_fetched">Last Fetched</option>` to the sort dropdown.
    - [x] Modify the `feedListQuery` logic to handle the `last_fetched` sort key.
        - [x] Implement the logic: `orderBy(({ feed }) => feed.lastFetchedAt, "asc")` (or equivalent custom sorting if the DB adapter requires specific handling for nulls first).
        - [x] Ensure the tie-breaker (Title ASC) is applied.

- [x] Task: Conductor - User Manual Verification 'Test & Implementation' (Protocol in workflow.md) [81ee6b4]
