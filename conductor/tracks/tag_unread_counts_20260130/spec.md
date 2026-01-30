# Track Specification: Tag List Unread Counts

## 1. Overview
The goal of this track is to enhance the item list view by displaying the unread item count next to each tag in the tag filter list. This will allow users to quickly see how many unread items are available for each tag without having to select it first.

## 2. Functional Requirements

### 2.1 Unread Count Display
- **Location:** The unread count must be displayed within or immediately adjacent to the tag buttons in the `ItemList` component (top filter bar).
- **Format:** The count should be displayed as a number (e.g., "Tech (5)", "News (12)").
- **Visibility:** 
    - If a tag has 0 unread items, the count should either be hidden or show "(0)" depending on design consistency (Decision: Show "(0)" or hide? -> *Proposal: Hide if 0 for cleaner UI, or follow "FeedList" pattern if it exists.* Let's assume **Hide if 0** for now unless specified otherwise).
    - The "All" filter should ideally show the total unread count across all tags.

### 2.2 Data Source
- The frontend needs a way to fetch unread counts per tag.
- **Backend Change:** The `ListTags` or a similar API endpoint likely needs to be updated to return the unread count for each tag. Currently, `Tag` objects might only have `id` and `name`. We need to add an `unread_count` field.

### 2.3 Real-time / Reactive Updates
- The counts should update when:
    - Items are fetched/synced.
    - Items are marked as read/unread.

## 3. Technical Impact Analysis

### 3.1 Backend (Go)
- **Proto Definitions:** Update `proto/tag/v1/tag.proto` (or equivalent) to add `int64 unread_count` to the `Tag` message.
- **Database:**
    - Update SQL queries to calculate unread counts per tag. This likely involves a JOIN between `tags`, `feed_tags`, and `items` (where `is_read = false`).
    - Update `ListTags` implementation in `cmd/feed-reader/tag_service.go` (and `store/tag_store.go`) to populate this new field.

### 3.2 Frontend (TypeScript/SolidJS)
- **Generated Code:** Regenerate frontend code from updated protos.
- **Component:** Update `frontend/src/components/ItemList.tsx` to render the unread count in the tag buttons.
- **State Management:** Ensure `useTags` hook reflects the updated data structure.

## 4. Acceptance Criteria
1.  **Tag List UI:** The horizontal list of tags in the Items view displays a number next to each tag name indicating the count of unread items associated with that tag.
2.  **Accuracy:** The count accurately reflects the number of unread items in the database for that tag.
3.  **Zero State:** Tags with 0 unread items do not show a counter (or show 0, consistent with other UI).
4.  **"All" Filter:** The "All" filter displays the total unread count of all items.

## 5. Out of Scope
- Changing the design of the tag management modal.
- Adding unread counts to the "Feed List" sidebar (this is already implemented or handled separately).
