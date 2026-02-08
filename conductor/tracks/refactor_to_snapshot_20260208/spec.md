# Specification: Refactor Existing Tests to Snapshot Testing

## Overview
Following the successful introduction of snapshot testing infrastructure, this track aims to migrate existing complex manual assertions to snapshot testing. This will simplify test code, improve visibility into changes, and ensure comprehensive coverage of complex data structures and UI states.

## Goals
- Simplify maintenance of tests involving complex data (XML, JSON, HTML).
- Improve detection of unintended regressions in database query results.
- Standardize testing patterns across the codebase using established snapshot infrastructure.

## Scope

### 1. Backend (Go)
- **OPML Logic**: Migrate `opml_test.go` and `opml_importer_test.go` to use `golden.Assert`.
- **Database Queries**: Migrate `store/queries_test.go` to verify full result sets via snapshots.
- **API Routing**: Migrate `cmd/feed-reader/item_routing_test.go` to use `protojson` snapshots.

### 2. Frontend (SolidJS)
- **Markdown Rendering**: Migrate `MarkdownRenderer.test.tsx` to `toMatchSnapshot()`.
- **Rich UI Components**: Migrate `ItemDetailModal.test.tsx` and `ItemList.test.tsx` to ensure stable rendering of complex layouts.

## Acceptance Criteria
- Existing assertions in targeted files are replaced with snapshot-based assertions.
- All tests pass with the newly generated golden/snapshot files.
- Dynamic data (timestamps, IDs) in database results are correctly masked.
