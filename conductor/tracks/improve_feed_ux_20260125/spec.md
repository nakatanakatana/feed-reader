# Specification: Improve Feed Management UX

## Overview
This track aims to improve the user experience of feed management by refining the information layout and providing more efficient ways to organize feeds using tags. Currently, feed-related pages display article items, which can clutter the management interface. Additionally, tagging feeds is a manual, one-by-one process that needs to be streamlined.

## Functional Requirements

### 1. Remove Feed Items from Feed Pages
- **Feed List Page:** Ensure that no article previews or item lists are displayed. Focus the UI strictly on the list of subscribed feeds and their management.
- **Feed Detail Page (`/feeds/$feedId`):** Remove the list of articles (Feed Items) from this page. This page should focus on feed metadata (title, URL, description), statistics, and configuration options.

### 2. Bulk Tag Management for Feeds
- **Selection Mechanism:** Add checkboxes to the Feed List Page to allow users to select multiple feeds simultaneously.
- **Bulk Action UI:** Introduce a "Manage Tags" button that becomes active when one or more feeds are selected.
- **Tag Management Modal:**
    - Clicking "Manage Tags" opens a modal dialog.
    - The modal should list all existing tags.
    - Users can select tags to add to all selected feeds or remove from all selected feeds.
    - The modal should provide clear feedback on which tags will be added and which will be removed.
- **API Integration:** Ensure the backend supports or is updated to handle bulk tag updates (associating/dissociating multiple feeds with tags in one or fewer operations if possible).

## Non-Functional Requirements
- **Consistency:** The UI for checkboxes and modals should follow existing design patterns (Panda CSS, SolidJS components).
- **Performance:** Bulk operations should be handled efficiently without long UI freezes.
- **Responsiveness:** Ensure the new checkboxes and the bulk action button work well on mobile devices.

## Acceptance Criteria
- Articles are no longer visible on the Feed List Page and Feed Detail Page.
- Users can select multiple feeds in the list.
- A "Manage Tags" button appears/activates upon selection.
- The Tag Management Modal opens and allows selecting tags for addition or removal.
- Upon saving in the modal, the selected feeds reflect the changes in their associated tags.
- Unit and integration tests cover the new selection logic and bulk update functionality.

## Out of Scope
- Complete redesign of the article reading interface (only removing them from feed pages is in scope).
- Adding new tag creation functionality within the bulk modal (assume tags are managed separately or via existing means).
