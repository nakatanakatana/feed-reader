## MODIFIED Requirements

### Requirement: Add RSS/Atom Feeds
The system SHALL allow users to add new RSS or Atom feeds by providing a valid URL, and frontend tag-selection and feed-related forms SHALL consume shared query definitions for reusable tag list data.

#### Scenario: Successful feed addition
- **WHEN** the user submits a valid feed URL
- **THEN** the system SHALL validate the URL, register the feed metadata, and schedule the first fetch

#### Scenario: Feed form uses shared tag query
- **WHEN** the feed creation flow needs the available tag list
- **THEN** it SHALL consume a shared frontend tag query definition that can also be reused by other feed and tag management screens

### Requirement: Manual Feed Refresh
The system SHALL allow users to trigger an immediate refresh for one or more feeds directly from the UI, and feed-management screens SHALL derive feed filtering and sorting from shared frontend query definitions rather than duplicating query composition inside each component.

#### Scenario: User triggers manual refresh
- **WHEN** the user selects "Refresh" for a specific feed
- **THEN** the system SHALL bypass the background scheduler and initiate an immediate fetch, providing real-time feedback on success or failure

#### Scenario: Feed list filtering and sorting remain consistent
- **WHEN** the user changes a feed filter or sort option
- **THEN** the visible feed list SHALL be derived from shared frontend query definitions that preserve the same filtering and ordering behavior across feed-management views
