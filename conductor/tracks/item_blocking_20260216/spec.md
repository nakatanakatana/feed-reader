# Specification: Item Blocking (Mute) Feature

## Overview
Add a feature to hide (mute) specific items based on usernames (parsed from URLs), domains, or keywords in the title/content. The system must maintain high performance for item retrieval even with a large number of blocking rules.

## Functional Requirements
### 1. Blocking Rule Management
- **User/Domain Blocking**:
    - Support blocking by `username`, `domain`, or a combination of `username + domain`.
- **Keyword Blocking**:
    - Support blocking based on keywords found in the item's `title` or `content`.
- **Dynamic URL Parsing Rules**:
    - Manage rules (e.g., regex patterns) in the database per domain to define how to extract a `username` from an item's URL.

### 2. Filtering Logic (Save-time Flagging)
- When an item is fetched and saved to the database, apply current blocking rules and set an `is_hidden` flag on the item record.
- The item retrieval API will filter results to return only items where `is_hidden = false`.

### 3. Retroactive Application
- When blocking rules are added, updated, or deleted, a background process must re-evaluate and update the `is_hidden` flag for existing items in the database.

## Non-Functional Requirements
- **Performance**: Item listing (Read) performance must not be degraded by the number of blocking rules.
- **Scalability**: Background update processes should be optimized to avoid interfering with other system operations (like crawling).

## Acceptance Criteria
- [ ] Able to register and edit username extraction rules per domain.
- [ ] Able to register blocking rules for users, domains, and keywords.
- [ ] Newly fetched items are automatically hidden if they match any blocking rules.
- [ ] Existing items are updated to reflect changes when blocking rules are modified.
- [ ] The item listing API correctly excludes hidden items.

## Out of Scope
- Temporary client-side hiding (only permanent database-level blocking is covered).
- Advanced regex matching for keywords (simple substring matching is assumed for the initial scope).
