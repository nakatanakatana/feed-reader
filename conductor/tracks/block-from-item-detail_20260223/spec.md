# Specification: Block from Item Detail Modal

## Overview
This track introduces the ability to add item blocking rules directly from the `ItemDetailModal`. This allows users to quickly block content creators or domains without leaving the current reading context, improving the efficiency of content curation.

## Functional Requirements
- **Header Menu Addition:** Add a "More actions" kebab menu (using the existing `KebabMenu` component) to the header of the `ItemDetailModal`, next to the "Close" button.
- **Blocking Options:** The kebab menu should provide the following options when a user/domain can be extracted from the article's URL:
    - **Block Domain:** Add a rule of type `domain` with the article's hostname.
    - **Block User @ Domain:** Add a rule of type `user_domain` with the extracted user and domain.
    - **Block User:** Add a rule of type `user` with the extracted user.
- **Frontend URL Parsing:** Implement logic in the frontend to extract user and domain from the article URL, mirroring the backend's `URLParser` logic.
    - Fetch existing `url_parsing_rules` via the API to perform accurate extraction.
- **UX Feedback:**
    - After adding a block rule, remain on the current article view.
    - Show a success notification confirming the rule was added.
- **Display Logic:** Only show blocking options that are valid for the current article's URL.

## Non-Functional Requirements
- **Performance:** Frontend URL parsing should be efficient and non-blocking.
- **Consistency:** Use existing UI components and adhere to project design guidelines.
- **Mobile Friendly:** Ensure the kebab menu has adequate hit targets (min 44x44px).

## Acceptance Criteria
- [ ] A kebab menu is visible in the `ItemDetailModal` header.
- [ ] Clicking the menu shows valid blocking options (Domain, User, etc.).
- [ ] Selecting an option triggers the `AddItemBlockRules` RPC with correct parameters.
- [ ] A success message is displayed after a rule is successfully added.
- [ ] The user remains on the current article after blocking.
- [ ] The feature works correctly on both desktop and mobile viewports.

## Out of Scope
- Managing or deleting existing block rules from within the `ItemDetailModal`.
- Blocking by keyword or author name (limited to Domain and User-related rules for this track).
