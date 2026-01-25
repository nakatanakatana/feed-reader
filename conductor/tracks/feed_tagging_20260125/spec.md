# Track Specification: Feed Tagging System

## Overview
Introduce a tagging system to allow users to organize and filter feeds by genres or labels. This feature will support a many-to-many relationship between feeds and tags, enabling flexible categorization and improved content discovery.

## Functional Requirements

### Tag Management
- Users can create, list, and delete tags independently.
- Tags are simple text labels.

### Feed Tagging
- Users can associate multiple tags with a single feed (Many-to-Many).
- Users can add or remove tags when adding a new feed or editing an existing one.
- Visual display of tags (as chips/labels) next to feed names in the UI.

### Filtering and Navigation
- **Feed List Filtering:** A filter (e.g., dropdown) at the top of the feed list allows users to narrow down displayed feeds by selected tags.
- **Article List Filtering:** Selecting a tag will display a combined view of articles from all feeds associated with that tag.

## Non-Functional Requirements
- **Performance:** Filtering feeds and articles by tags should be efficient, utilizing database indexing.
- **UI/UX:** The tagging interface should be intuitive, using modern UI components (chips, multi-select).

## Acceptance Criteria
- [ ] Database schema updated to support Tags and Feed-Tag associations.
- [ ] Backend API (Connect RPC) updated to manage tags and support tag-based filtering for feeds and articles.
- [ ] UI allows creating and deleting tags.
- [ ] UI allows assigning/unassigning tags to feeds.
- [ ] Feed list can be filtered by tags.
- [ ] Article list can be filtered by tags, showing articles from all relevant feeds.
- [ ] Visual tag chips are displayed in the feed and article views.

## Out of Scope
- Automatic tagging based on feed content or keywords.
- Hierarchical/nested tags.
- Renaming tags (deletion and re-creation as a workaround for now).
