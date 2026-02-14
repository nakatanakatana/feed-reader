# Specification: Adjust Favicon Colors and Thresholds

## Overview
Adjust the thresholds and colors of the dynamic favicon, which changes based on the unread item count. This change aims to provide better visual cues for users with larger volumes of unread items.

## Functional Requirements
Update the favicon color logic based on the `unreadCount` as follows:

1.  **Blue (#3b82f6)**
    - Range: 0 to 199 items
    - Note: Even with 0 unread items, the favicon will be Blue (replacing the previous Neutral/Gray).
2.  **Orange (#f97316)**
    - Range: 200 to 999 items
    - Note: This replaces the previous "Yellow" color.
3.  **Red (#ef4444)**
    - Range: 1,000+ items

## Non-Functional Requirements
- **Consistency**: Maintain consistency with the existing `DynamicFavicon` component and `favicon.ts` logic.
- **Testability**: Verify that colors switch correctly at boundary values (0, 199, 200, 999, 1000) through automated tests.

## Acceptance Criteria
- [ ] Favicon is Blue (#3b82f6) when unread count is 0, 100, or 199.
- [ ] Favicon is Orange (#f97316) when unread count is 200, 500, or 999.
- [ ] Favicon is Red (#ef4444) when unread count is 1,000 or more.
- [ ] Existing tests are updated to match new thresholds and all pass.

## Out of Scope
- Changes to the favicon shape or SVG design itself.
- Color changes based on status other than unread count (e.g., error states).
