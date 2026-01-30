# Specification: Improved Tag Unread Count Display

## Overview
Improve the visual consistency and readability of unread count badges in the filter bar (Tag buttons and the "All" button). Currently, the presence of a badge can cause the button height to fluctuate, and very high counts can expand the badge excessively.

## Functional Requirements
- **Consistent Height:** Adjust the styling of Tag filter buttons and the "All" filter button so that their height remains identical whether an unread count badge is displayed or not.
- **Count Formatting:** For unread counts of 1000 or more, display the value as "999+". For counts up to 999, display the exact number.
- **Scope:**
  - Individual Tag filter buttons in the `FeedList` component.
  - The "All" filter button in the `FeedList` component.
  - (Optional but recommended for consistency) Any other similar filter buttons like the "All" or Tag filters in `ItemList` if they share the same issue.

## Non-Functional Requirements
- **Visual Alignment:** The badge should be visually centered or aligned with the text in a way that doesn't disrupt the baseline or overall button layout.
- **Maintainability:** Use a helper function for formatting the unread count if it's used in multiple places.

## Acceptance Criteria
- [ ] Clicking between tags with and without unread counts does not cause the filter bar or buttons to "jump" in height.
- [ ] A tag with 1000 unread items displays "999+".
- [ ] A tag with 500 unread items displays "500".
- [ ] The "All" button also follows these rules for height consistency and count formatting.

## Out of Scope
- Changing the unread count display on individual feed items (per the user's choice to focus on filter buttons).
- Modifying the backend logic for counting unread items.
