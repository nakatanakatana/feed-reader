# Specification: Improve Item List and Detail Modal

## Overview
This track focuses on enhancing the item browsing experience by improving the item list's information density, fixing navigation issues in the detail view, adding standard modal interactions (Esc/Backdrop close), and providing a way to view read items.

## Functional Requirements

### 1. Item List Enhancements
- **Additional Metadata Display:** Each item row in the list will now display its creation date (`created_at`) and the first line of its description.
  - **Layout:** These items will appear as a second line below the title, styled with a lighter text color to maintain visual hierarchy.
- **Read/Unread Visibility Toggle:**
  - Add a toggle switch or button at the top of the item list (header area) to show or hide items that have already been marked as read.
  - **Default State:** By default, only unread items should be shown.

### 2. Item Detail Modal Improvements
- **Navigation Fix:** Fix the "Next" and "Previous" buttons within the detail modal so they correctly navigate through the list of items.
- **Enhanced Dismissal:**
  - Implement "Close on Backdrop Click": Clicking outside the modal content area will close the modal.
  - Implement "Close on ESC Key": Pressing the Escape key will close the modal.
  - No special confirmation is required when closing via these methods.

## Non-Functional Requirements
- **Responsive Design:** The new layout for item rows and the visibility toggle must be functional and visually appealing on both desktop and mobile devices.
- **Performance:** Filtering the list by read/unread status should be efficient and not cause noticeable lag.

## Acceptance Criteria
- [ ] Item rows display `created_at` and description snippet on a second line.
- [ ] A toggle exists at the top of the item list to show/hide read items.
- [ ] Toggling "Show Read" correctly updates the list in real-time.
- [ ] Next/Prev buttons in the detail modal navigate to the next/previous item respectively.
- [ ] Clicking the background of the detail modal closes it.
- [ ] Pressing the ESC key while the detail modal is open closes it.

## Out of Scope
- Advanced search/filtering beyond read/unread status (this may be a separate track).
- Customizing the number of lines displayed for the description.
