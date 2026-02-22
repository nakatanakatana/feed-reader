# Track Specification: Block Management Frontend

## Overview
Implement the frontend functionality for managing content filtering (blocking) rules. This includes two independent pages for managing `URLParsingRule` and `ItemBlockRule`, following the existing "Feeds" page layout with an input form at the top and a card-based list at the bottom.

## Functional Requirements
1. **Navigation**:
   - Add direct links to "URL Rules" and "Block Rules" in the main header.
2. **URL Rules Management Page (`/url-rules`)**:
   - **Add Form**: Positioned at the top. Includes the following fields:
     - `domain`: Target domain (text input)
     - `rule_type`: Type of rule (dropdown: `subdomain`, `path`)
     - `pattern`: Pattern (text input)
   - **Rule List**: Positioned at the bottom, displayed in card format.
     - Each card displays rule details (Domain, Type, Pattern) and a delete button.
3. **Block Rules Management Page (`/block-rules`)**:
   - **Add Form**: Positioned at the top. Includes the following fields:
     - `rule_type`: Type of rule (dropdown: `user`, `domain`, `user_domain`, `keyword`)
     - `value`: Value to block (text input)
     - `domain`: Target domain (text input, required for `user_domain` and `domain`, optional otherwise)
   - **Rule List**: Positioned at the bottom, displayed in card format.
     - Each card displays rule details (Type, Value, Domain) and a delete button.
4. **Common Specifications**:
   - The list section should be vertically scrollable.
   - Ensure the layout is responsive and prevents horizontal scrolling on the entire screen.
   - Manage data fetching, adding, and deleting using TanStack Query and Connect RPC.

## Acceptance Criteria
- [ ] Users can add a new rule on the "URL Rules" page, and it is immediately reflected in the list.
- [ ] Users can add a new rule on the "Block Rules" page, and it is immediately reflected in the list.
- [ ] Users can delete existing rules on both pages.
- [ ] Navigation links in the header correctly transition to their respective pages.
- [ ] The layout is responsive and free of horizontal scrolling on mobile devices.
