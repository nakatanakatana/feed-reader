# Track Specification: Feed Management Screen Improvements

## Overview
Improve the usability of the Feed Management screen by enhancing filtering capabilities, adding sorting functionality, and refining interaction patterns for feed items.

## Functional Requirements

### 1. "Uncategorized" Filter
- Add an "Uncategorized" button to the filter area in the Feed List.
- When selected, it should display only feeds that have no tags assigned.

### 2. Sorting Functionality
- Add a sorting dropdown menu near the filter area.
- Support the following sorting orders:
    - Title (A-Z / Ascending)
    - Title (Z-A / Descending)
    - Date Added (Newest first / Descending)
    - Date Added (Oldest first / Ascending)
    - Last Updated/Fetched (Newest first / Descending)

### 3. Clickable Card Area for Selection
- Make the entire area of a feed card (excluding links and buttons) clickable.
- Clicking this area should toggle the checkbox state (selected/unselected) for that feed.

### 4. Feed Title Navigation & Internal Link
- Update the feed title link to open the feed's registered external website (`link`) in a new window/tab (`_blank`).
- Add a separate icon or link (e.g., a "details" or "list" icon) to each card to navigate to the internal Feed Detail page (item list).

## UI/UX Design

- **Filters:** Positioned as `[All] [Uncategorized] [Tag A] ...`.
- **Sorting:** A select dropdown labeled "Sort by:".
- **Card Interaction:** Apply `cursor: pointer` to the entire card background to indicate it is interactive.
- **Internal Link:** Place a small icon button (e.g., an external link icon for the title, and a list icon for internal detail) clearly within the card.

## Acceptance Criteria
- [ ] The "Uncategorized" filter correctly shows only feeds with no tags.
- [ ] Selecting a sort option immediately reorders the feed list.
- [ ] Clicking the card background toggles the feed's selection checkbox.
- [ ] Clicking the feed title opens the external link in a new tab.
- [ ] A new detail icon successfully navigates the user to the internal feed detail page.

## Out of Scope
- Backend-side sorting or filtering implementation (processing will be handled on the frontend for now).
- Sorting or filtering for other entities (e.g., items).
