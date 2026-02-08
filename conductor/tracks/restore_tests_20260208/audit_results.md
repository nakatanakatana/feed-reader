# Audit Results: Skipped Tests and Mocks

## Skipped Tests in `frontend/src/components`
- `FeedList.UnreadCount.test.tsx`:
    - "displays unread count for each feed"
    - "displays total unread count in filter select"
    - "displays unread counts for tags in filter bar"
    - "formats unread counts of 1000 or more as '999+'"
- `ItemList.DateFilterProp.test.tsx`:
    - "initializes filter with provided dateFilter prop"
- `FeedList.Sorting.test.tsx`:
    - "sorts feeds correctly by title and date"
- `FeedList.Navigation.test.tsx`:
    - "has correct navigation links: external title and internal detail icon"
- `ManageTagsModal.test.tsx`:
    - "renders the modal with tags"
- `ItemList.DateFilter.test.tsx`:
    - "updates createItems filter when date filter is changed"
- `FeedList.CardClick.test.tsx`:
    - "toggles selection when clicking the card background"
- `TagManagement.test.tsx`:
    - "adds a new tag"
    - "deletes a tag after confirmation when tag has feeds"
    - "skips confirmation when tag has no feeds"
- `FeedList.Uncategorized.test.tsx`:
    - "keeps feeds visible when tag filters change"
- `FeedList.Responsive.test.tsx`:
    - "hides action buttons from the header on mobile"
    - "shows a floating action button on mobile when feeds are selected"
    - "does not show a floating action button on desktop"
- `ItemList.Defaults.test.tsx`:
    - "calls items with default filters: showRead=false, dateFilter=30d"
- `ItemList.ShowReadToggle.test.tsx`:
    - "updates createItems params when toggle is clicked"
- `FeedList.test.tsx`:
    - "displays a list of feeds"
    - "deletes a feed"
    - "supports bulk selection"
    - "manages tags for selected feeds"

Total: 23 tests skipped.

## Mocked Modules
The following modules are heavily mocked across almost all component tests:
- `@tanstack/solid-db`
- `../lib/db`
- `../lib/item-db`

## Observations
- The tests are currently mocking the database layer entirely, which means they are not testing the actual data flow and reactivity provided by `@tanstack/solid-db`.
- The `FeedManagement` and `ArticleStatus` tests are among the skipped ones, as identified in the track specification.
