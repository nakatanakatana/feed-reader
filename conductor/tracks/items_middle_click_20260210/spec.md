# Specification: items_middle_click_20260210

## Overview
Add a feature to open the original article link in a new tab when an item is middle-clicked in the "All Items" list, while simultaneously marking the item as read. This requires extending the backend API response to include the article's URL.

## Functional Requirements
- **Backend API (Connect RPC)**:
    - Add a `url` field (string) to the `item.v1.Item` message.
    - Update DB queries and response transformation logic to include the original article URL in the response.
- **Frontend UI**:
    - Detect middle-click events (`auxclick` with `button === 1`) on item rows in the `ItemList` and `ItemRow` components.
    - Open the article URL using `window.open(url, '_blank', 'noopener,noreferrer')` upon middle-click.
    - Trigger a background API request to mark the item as read immediately after the middle-click.
    - Ensure that middle-clicking does not trigger the default click action (opening the item detail modal).

## Non-Functional Requirements
- **Security**: Use `noopener,noreferrer` when opening external links in new tabs to prevent security risks.
- **UX**: Support standard browser behavior for middle-clicking to provide an efficient reading experience.

## Acceptance Criteria
- Middle-clicking an item opens the correct article URL in a new tab.
- The item is marked as read (unread indicator disappears) immediately after middle-clicking.
- The item detail modal does NOT open when an item is middle-clicked.
- The API response for items correctly includes the article URL.

## Out of Scope
- Keyboard shortcuts for opening links in new tabs.
- Assigning functions to other mouse buttons (e.g., side buttons).
