# article-management Specification

## Purpose
TBD - created by archiving change setup-openspec-from-conductor. Update Purpose after archive.
## Requirements
### Requirement: Mark Articles as Read/Unread
The system SHALL track the read/unread status of each article and allow users to toggle this state manually, and frontend article queries that expose list state SHALL consistently merge the synchronized read-state source with the base item collection.

#### Scenario: Toggle read status
- **WHEN** the user selects the "Mark Read" or "Mark Unread" action
- **THEN** the system SHALL update the article state and provide visual feedback

#### Scenario: Read state is reflected consistently across article views
- **WHEN** an article read-state change is applied through the synchronized read-state source
- **THEN** shared frontend article queries used by list and navigation views SHALL reflect the same effective read status

### Requirement: Article Filtering by Date
The system SHALL allow users to filter articles based on their publication or discovery date (Past 24 hours, 7 days, 30 days, etc.), and all frontend views that depend on the current article list SHALL derive that list from the same shared query definition for filtering, ordering, and tag constraints.

#### Scenario: Apply date filter
- **WHEN** the user selects a date range filter
- **THEN** only articles within the specified range SHALL be displayed in the list

#### Scenario: Navigate detail view within filtered article list
- **WHEN** the user opens an article detail view from a filtered or tag-constrained list
- **THEN** the previous and next article navigation SHALL be derived from the same shared frontend query definition used for the corresponding article list

### Requirement: Bulk Article Actions
The system SHALL allow users to select multiple articles and perform actions like "Mark as Read" simultaneously.

#### Scenario: Mark multiple articles as read
- **WHEN** the user selects multiple articles and clicks "Mark Read" from the bulk action bar
- **THEN** all selected articles SHALL have their status updated to "Read" in a single operation.

### Requirement: Item Blocking Rules
The system SHALL support blocking articles based on user-defined criteria such as keywords, domains, or specific user/domain combinations.

#### Scenario: Automatically block unwanted content
- **WHEN** a new article matches an active block rule
- **THEN** the system SHALL hide the article from all retrieval APIs.

### Requirement: Article Detail View
The system SHALL provide a clean, modal interface for reading full article content with support for keyboard-based navigation.

#### Scenario: Navigate between articles in detail view
- **WHEN** the user presses "J" or "K" in the article modal
- **THEN** the system SHALL navigate to the next or previous article in the current list.

