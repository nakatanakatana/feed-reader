# Implementation Plan: Item Blocking (Mute) Feature

This plan implements a high-performance item blocking feature based on usernames, domains, and keywords, using a save-time flagging approach and background retroactive updates.

## Phase 1: Database Schema and Models [checkpoint: 5f2e614]
Define the storage for blocking rules, URL parsing rules, and update the item model.

- [x] Task: Create migration for `blocking_rules` table ee03836
- [x] Task: Create migration for `url_parsing_rules` table 96d2b15
- [x] Task: Add `is_hidden` column to `items` table e250c80
- [x] Task: Update Go models and SQLC queries for new tables and column 6c3969d
- [x] Task: Conductor - User Manual Verification 'Phase 1: Database Schema and Models' (Protocol in workflow.md) 5f2e614

## Phase 2: Username Extraction Logic [checkpoint: 673d1f2]
Implement the logic to extract usernames from URLs based on domain-specific rules.

- [x] Task: Implement `UsernameExtractor` service in Go f37fc98
- [x] Task: Write tests for `UsernameExtractor` with various URL patterns and regex rules a7227d9
- [x] Task: Integrate `UsernameExtractor` into the item fetching pipeline 0eeb8ea
- [x] Task: Conductor - User Manual Verification 'Phase 2: Username Extraction Logic' (Protocol in workflow.md) 673d1f2

## Phase 3: Blocking Logic and Save-time Flagging [checkpoint: cdb1aba]
Implement the core filtering logic applied during item ingestion.

- [x] Task: Implement `BlockingService` to check if an item should be hidden 23b2bec
- [x] Task: Update the item creation flow to apply `BlockingService` and set `is_hidden` flag 22774c6
- [x] Task: Update item retrieval queries to exclude `is_hidden = true` by default (Already implemented in previous phases)
- [x] Task: Write integration tests for the full "fetch -> block -> hide" flow 2019bfa
- [x] Task: Conductor - User Manual Verification 'Phase 3: Blocking Logic and Save-time Flagging' (Protocol in workflow.md) cdb1aba

## Phase 4: Retroactive Background Updates
Implement the mechanism to update existing items when rules change.

- [x] Task: Implement a background worker to re-evaluate `is_hidden` for all items 413942e
- [x] Task: Trigger background update when a blocking rule is created/updated/deleted 61202d0
- [x] Task: Optimize background update (e.g., batch processing) to ensure scalability b28bc1f
- [ ] Task: Write tests for retroactive blocking application
- [ ] Task: Conductor - User Manual Verification 'Phase 4: Retroactive Background Updates' (Protocol in workflow.md)

## Phase 5: Frontend Integration (Rule Management UI)
Add UI components to manage blocking rules and URL parsing rules.

- [ ] Task: Create UI for managing Domain URL Parsing Rules
- [ ] Task: Create UI for managing Blocking Rules (User, Domain, Keyword)
- [ ] Task: Update item list UI to reflect hidden state (if needed for debugging/admin)
- [ ] Task: Conductor - User Manual Verification 'Phase 5: Frontend Integration (Rule Management UI)' (Protocol in workflow.md)
