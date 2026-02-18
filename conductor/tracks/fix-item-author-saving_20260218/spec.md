# Track Specification: Fix Item Author Saving

## Overview
Currently, the item author information is not being saved during the fetching and storage process. This track aims to fix the storage logic to correctly extract and save the author's name from the `gofeed.Item` structure and display it in the frontend's item detail modal.

## Functional Requirements
- **Data Collection (Fetcher/Storage)**
    - Extract the author's name from `gofeed.Item` and save it to the `items.author` column in the database.
    - **Extraction Logic:**
        1. Use `item.Author.Name` if it is not empty.
        2. If `item.Author.Name` is empty, use the name of the first element in `item.Authors` (`item.Authors[0].Name`) if available.
        3. If no name is found, treat it as `NULL` or an empty string (following existing backend conventions). No fallback to Email or URI.
- **UI (Frontend)**
    - Display the saved author information in the `ItemDetailModal.tsx`.
    - The design should be integrated into the existing modal layout, placed near the title or publication date.

## Non-Functional Requirements
- **Data Integrity**: Ensure that existing items remain unaffected; updates apply to newly fetched or updated items.
- **Performance**: The extraction logic must be lightweight and not impact the overall performance of the fetch/storage cycle.
- **Testing**: Implement unit tests for both backend extraction and frontend rendering.

## Acceptance Criteria
- [ ] RSS/Atom feed items with author information correctly save the author's name to the database after fetching.
- [ ] Only the author's name is saved; Email and URI are ignored.
- [ ] The author's name is rendered in the `ItemDetailModal` in the frontend.
- [ ] Backend tests verify the extraction logic from `gofeed.Item` to `store.CreateItemParams`.
- [ ] Frontend tests verify that the `author` field is correctly displayed in the modal.

## Out of Scope
- Storing multiple authors (only the primary/first author is supported).
- Retroactively fixing or backfilling author data for items already in the database.
- Displaying the author's name in the main feed list or cards.
