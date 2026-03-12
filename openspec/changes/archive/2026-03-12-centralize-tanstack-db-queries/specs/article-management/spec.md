## MODIFIED Requirements

### Requirement: Article Filtering by Date
The system SHALL allow users to filter articles based on their publication or discovery date (Past 24 hours, 7 days, 30 days, etc.), and all frontend views that depend on the current article list SHALL derive that list from the same shared query definition for filtering, ordering, and tag constraints.

#### Scenario: Apply date filter
- **WHEN** the user selects a date range filter
- **THEN** only articles within the specified range SHALL be displayed in the list

#### Scenario: Navigate detail view within filtered article list
- **WHEN** the user opens an article detail view from a filtered or tag-constrained list
- **THEN** the previous and next article navigation SHALL be derived from the same shared frontend query definition used for the corresponding article list

### Requirement: Mark Articles as Read/Unread
The system SHALL track the read/unread status of each article and allow users to toggle this state manually, and frontend article queries that expose list state SHALL consistently merge the synchronized read-state source with the base item collection.

#### Scenario: Toggle read status
- **WHEN** the user selects the "Mark Read" or "Mark Unread" action
- **THEN** the system SHALL update the article state and provide visual feedback

#### Scenario: Read state is reflected consistently across article views
- **WHEN** an article read-state change is applied through the synchronized read-state source
- **THEN** shared frontend article queries used by list and navigation views SHALL reflect the same effective read status
