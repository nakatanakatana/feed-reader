# Specification: Remove Saved Feature

This track aims to completely remove the "Saved" (Bookmark) feature, which is currently not in use, from the entire system.

## 1. Overview
Remove the functionality and data structures related to saving items (`is_saved`, `saved_at`) across the database, backend API, frontend UI, and documentation.

## 2. Functional Requirements

### 2.1 Database
- Drop `is_saved` (INTEGER) and `saved_at` (TEXT) columns from the `items` table.
- Update any views (e.g., `item_status_view`) to remove these columns.
- Update SQL queries in `sql/query.sql` to remove references to `is_saved` and `saved_at`.

### 2.2 Backend (Go / Connect RPC)
- Remove `is_saved` field from Protobuf definitions (`proto/item/v1/item.proto`).
- Remove `is_saved` from `ListItemsRequest` (filter) and `UpdateItemStatusRequest` (status update).
- Delete logic, methods, and tests related to the saved feature in the store layer (`store/`) and handler layer (`cmd/feed-reader/`).

### 2.3 Frontend (React / TypeScript)
- Remove the "Save" (star) icon and associated actions from the item list.
- Remove "Saved" filtering options from the item list UI.
- Remove keyboard shortcuts related to the "Save" action if any exist.
- Clean up client-side type definitions and data fetching logic in `frontend/src/lib/`.

### 2.4 Documentation
- Remove descriptions of the "Saved" feature from `conductor/product.md`.
- Update technical documentation such as `docs/feed_specification.md` to reflect the removal.

## 3. Non-Functional Requirements
- **Data Compatibility:** This is a breaking change that requires database schema migration.
- **Performance:** Improve storage efficiency by removing unused columns and potential indexes.

## 4. Acceptance Criteria
- Columns `is_saved` and `saved_at` are successfully removed from the database.
- Backend API no longer exposes `is_saved` and passes compilation.
- Frontend UI is cleared of all "Saved" related elements (icons, filters).
- All tests (Go and Vitest) pass.
- Documentation no longer mentions the "Saved" feature.

## 5. Out of Scope
- Changes to other item statuses (e.g., Read/Unread).
