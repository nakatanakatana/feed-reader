# opml-integration Specification

## Purpose

TBD - created by archiving change setup-openspec-from-conductor. Update Purpose after archive.

## Requirements

### Requirement: OPML Import

The system SHALL support bulk import of existing subscriptions from a standard OPML file.

#### Scenario: Successful OPML import

- **WHEN** the user uploads a valid OPML file
- **THEN** the system SHALL register all unique feeds, apply associated tags, and initiate background fetching.

### Requirement: OPML Export

The system SHALL allow users to export their feed subscriptions to a standard OPML 2.0 file, including associated tags.

#### Scenario: Export feeds to OPML

- **WHEN** the user initiates an OPML export
- **THEN** the system SHALL generate and download an OPML file representing all currently subscribed feeds and their tags.
