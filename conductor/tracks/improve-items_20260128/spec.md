# Track Specification: Item List and Detail Modal Improvements

## Overview
This track focuses on improving the user experience for the item list and detail modal. The primary goals are to streamline the consumption of unread articles (oldest first, sequential navigation in the modal) and enrich the stored article data with additional information from the feed.

## Functional Requirements

### 1. Item List Enhancements
- **Default Sort & Filter**: Change the default view to show "Unread items only" (`is_read=false`) sorted by "Oldest first" (`published_at ASC`).
- **Unread Count Visibility**:
    - Display the total unread count (across all feeds) in the header or sidebar.
    - Display the unread count per feed next to each feed title in the sidebar.

### 2. Item Detail Modal Improvements
- **Title as Link**: Convert the article title in the modal into a hyperlink pointing to the original article URL.
- **UI Simplification**: Remove the dedicated "Open Original Article" button as it will be integrated into the title link.
- **Enhanced Sequential Navigation**:
    - When the "Next" button is clicked at the end of the current client-side list, the application should automatically fetch the next page of unread items from the server and navigate to the next item seamlessly.
    - Items navigated through the modal should be synchronized with the background list (automatically triggering "Read More" logic).

### 3. Data Enrichment
- **Extended Storage**: Update the backend to extract and store the following additional fields from `gofeed.Feed.Item`:
    - **Content**: The full body of the article (HTML).
    - **Image/Enclosure URL**: The primary image or enclosure associated with the article.
    - **Categories**: Category or tag information provided by the feed.
- **API Updates**: Update Protobuf definitions and API responses to include these new fields.

## Non-Functional Requirements
- **Performance**: Ensure that unread count aggregation queries are optimized (e.g., via proper indexing on `is_read` and `feed_id`).
- **User Experience**: The transition when auto-fetching the next page in the modal should be smooth and provide visual feedback if there is a delay.

## Acceptance Criteria
- Default view is set to unread items, oldest first.
- Total and per-feed unread counts are visible in the sidebar.
- Clicking the title in the detail modal opens the original article URL.
- The "Open Original Article" button is removed from the modal.
- Navigating "Next" past the loaded list in the modal fetches and displays the next available unread item.
- New fields (Content, Image, Categories) are stored in the database and visible in the UI when available.

## Out of Scope
- Advanced filtering or management of categories (storage and simple display only).
- Elaborate animations for list updates when items are marked as read.
