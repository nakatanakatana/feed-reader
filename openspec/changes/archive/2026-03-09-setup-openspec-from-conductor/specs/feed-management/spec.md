## ADDED Requirements

### Requirement: Add RSS/Atom Feeds

The system SHALL allow users to add new RSS or Atom feeds by providing a valid URL.

#### Scenario: Successful feed addition

- **WHEN** the user submits a valid feed URL
- **THEN** the system SHALL validate the URL, register the feed metadata, and schedule the first fetch.

### Requirement: Feed Fetch Scheduling

The system SHALL automatically fetch feed updates based on an adaptive schedule that prioritizes active feeds while reducing load from static ones.

#### Scenario: Adaptive fetch interval

- **WHEN** a feed has high update frequency
- **THEN** the system SHALL increase the fetch frequency (min 15 minutes) based on historical update patterns.

### Requirement: Manual Feed Refresh

The system SHALL allow users to trigger an immediate refresh for one or more feeds directly from the UI.

#### Scenario: User triggers manual refresh

- **WHEN** the user selects "Refresh" for a specific feed
- **THEN** the system SHALL bypass the background scheduler and initiate an immediate fetch, providing real-time feedback on success or failure.

### Requirement: Suspend Feed Updates

The system SHALL allow users to temporarily halt updates for specific feeds for a configurable duration (1 Day, 3 Days, 1 Week, or 1 Month).

#### Scenario: Temporary suspension of feed updates

- **WHEN** the user selects a suspension duration for a feed
- **THEN** the system SHALL stop background fetching for that feed until the suspension period expires.
