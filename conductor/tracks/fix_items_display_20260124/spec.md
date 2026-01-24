# Track Specification: fix_items_display_issue

## Overview
Address an issue where items are not displayed in the frontend item lists (top page and individual feed pages) after the initial setup.

## Problem Statement
- Items from subscribed feeds are not visible to the user.
- The item list area remains blank on both the home page (`/`) and individual feed pages (`/feeds/:feedId`).
- This issue has persisted since the initial setup, suggesting a fundamental problem in the data fetching or rendering path.

## Functional Requirements
- Display stored items correctly in "All Feeds" and "Unread" lists on the home page.
- Display feed-specific items correctly on individual feed detail pages.
- Show an appropriate loading state while items are being fetched.
- Display a clear message (e.g., "No items found") when no items are available.

## Non-Functional Requirements
- Ensure proper communication between the Backend API (Connect RPC) and the Frontend.
- Maintain type safety using TypeScript definitions for data handling.

## Acceptance Criteria
- [ ] Items existing in the database are correctly displayed in the frontend lists.
- [ ] API requests in the browser's Network tab are successful and return expected data.
- [ ] No errors related to item rendering appear in the browser's Console.

## Out of Scope
- Fixes for adding new feeds (unless directly related to the display issue).
- Adding new features like marking items as read/unread.
