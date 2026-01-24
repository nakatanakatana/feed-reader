# Specification: Item Detail Modal

## Overview
Implement a modal window to display the full content and metadata of a selected item from the item list. This includes extending the schema to support "author" information for each item.

## Functional Requirements

### 1. Schema Extension (Backend & Protocol)
- Update `proto/item/v1/item.proto` to add an `author` field (string) to the `Item` message.
- Add an `author` column to the `items` table in the database schema.
- Update `sqlc` queries, Go models, and service implementations to handle the `author` field.

### 2. Item Detail Modal (Frontend)
- Trigger a modal display when an item is selected from the list.
- **Displayed Content:**
    - Article Title
    - Publication Date
    - Author Name (newly added field)
    - Article Body (rendered as HTML)
    - Link to the original article (Open in new tab)
- **Actions:**
    - Toggle Read/Unread status (immediate backend sync and UI update).
    - "Previous" and "Next" navigation buttons (switch content without closing the modal).
    - Close actions (close button, clicking outside, or pressing `Esc`).

### 3. Navigation Logic
- Correctly identify the "previous" and "next" items based on the current sort order and filters applied in the list view.

## Non-Functional Requirements
- **Accessibility:** Support keyboard interactions (Esc to close, arrow keys for navigation).
- **Responsiveness:** Ensure a readable layout on mobile devices (e.g., full-screen modal).
- **Performance:** Ensure smooth HTML rendering without UI freezing.

## Acceptance Criteria
- [ ] Selecting an item opens the modal with the correct title, body, author, and date.
- [ ] Author name is correctly fetched from the database and displayed.
- [ ] Toggling read/unread status in the modal is reflected immediately in the list view.
- [ ] "Previous" and "Next" buttons navigate through items according to the list's sort order.
- [ ] The modal is responsive and fully functional on mobile devices.

## Out of Scope
- Text size adjustment within the modal.
- Individual dark/light mode toggle for the modal.
