# Specification: Item Deduplication in Item List

## 1. Overview
Currently, the item list (especially in "All Items" view) sometimes displays duplicate entries. This appears to happen when a single item is associated with multiple feeds (e.g., via shared tags or cross-posted content), causing the database query to return the same item multiple times due to JOIN operations. This track aims to ensure that the item list only returns unique items.

## 2. Functional Requirements
- **Query Deduplication**: Update the backend item retrieval logic (likely SQL queries in `sql/query.sql`) to ensure that items are deduplicated.
- **Uniqueness Criteria**: Items should be considered duplicates if they share the same unique identifier (URL/GUID).
- **Scope**: This applies to all item listing endpoints (All Items, Feed-specific items, Tag-specific items).

## 3. Non-Functional Requirements
- **Performance**: The deduplication logic (e.g., `DISTINCT` or `GROUP BY`) should not significantly impact the performance of item list retrieval.
- **Data Integrity**: No existing item data should be deleted; the fix is focused on how items are queried and presented.

## 4. Acceptance Criteria
- **Backend Verification**: A test case is implemented where one item is linked to multiple feeds. The API must return this item exactly once in the item list.
- **Frontend Verification**: The "All Items" list in the UI no longer shows duplicate entries for the same article URL.
- **No Regression**: Filtering by feed or tag still works correctly and returns the expected unique items.

## 5. Out of Scope
- **Database Cleanup**: Physically merging or deleting duplicate rows that might already exist in the database (this track focuses on deduplication during retrieval).
