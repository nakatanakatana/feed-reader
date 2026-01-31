# Implementation Plan - Remove Deprecated HTML-to-Markdown Migration

## Phase 1: Preparation & Verification
- [ ] Task: Verify current state of tests
    - [ ] Run all tests to ensure a clean starting point (`go test ./cmd/feed-reader/...`)
    - [ ] Confirm `MIGRATE_CONTENT_MARKDOWN` usage in `main.go` and `migrate_md.go`
- [ ] Task: Conductor - User Manual Verification 'Phase 1: Preparation & Verification' (Protocol in workflow.md)

## Phase 2: Remove Migration Logic
- [ ] Task: Remove configuration flag from `main.go`
    - [ ] Remove `MigrateContentMarkdown` field from configuration struct
    - [ ] Remove usage of `cfg.MigrateContentMarkdown` in `main.go`
- [ ] Task: Delete migration files
    - [ ] Delete `cmd/feed-reader/migrate_md.go`
    - [ ] Delete `cmd/feed-reader/migrate_md_test.go`
- [ ] Task: Verify build and tests
    - [ ] Run `go build ./cmd/feed-reader` to ensure no lingering references prevent compilation
    - [ ] Run `go test ./cmd/feed-reader/...` to ensure no regressions
- [ ] Task: Conductor - User Manual Verification 'Phase 2: Remove Migration Logic' (Protocol in workflow.md)

## Phase 3: Final Cleanup & Review
- [ ] Task: Final Codebase Scan
    - [ ] Search for any remaining references to `MIGRATE_CONTENT_MARKDOWN` or `migrateHTMLToMarkdown`
- [ ] Task: Conductor - User Manual Verification 'Phase 3: Final Cleanup & Review' (Protocol in workflow.md)
