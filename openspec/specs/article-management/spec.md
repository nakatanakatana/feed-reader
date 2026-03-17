# article-management Specification

## Purpose

TBD - created by archiving change setup-openspec-from-conductor. Update Purpose after archive.

## Requirements

### Requirement: Mark Articles as Read/Unread

The system SHALL track the read/unread status of each article and allow users to toggle this state manually.

#### Scenario: Toggle read status

- **WHEN** the user selects the "Mark Read" or "Mark Unread" action
- **THEN** the system SHALL update the article state and provide visual feedback.

### Requirement: Article Filtering by Date

The system SHALL allow users to filter articles based on their publication or discovery date (Past 24 hours, 7 days, 30 days, etc.).

#### Scenario: Apply date filter

- **WHEN** the user selects a date range filter
- **THEN** only articles within the specified range SHALL be displayed in the list.

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
