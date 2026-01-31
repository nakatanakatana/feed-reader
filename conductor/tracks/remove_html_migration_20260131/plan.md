# Implementation Plan - Remove Deprecated HTML-to-Markdown Migration

## Phase 1: Preparation & Verification [checkpoint: 20a4471]
- [x] Task: Verify current state of tests
    - [x] Run all tests to ensure a clean starting point (`go test ./cmd/feed-reader/...`)
    - [x] Confirm `MIGRATE_CONTENT_MARKDOWN` usage in `main.go` and `migrate_md.go`
- [ ] Task: Conductor - User Manual Verification 'Phase 1: Preparation & Verification' (Protocol in workflow.md)

## Phase 2: Remove Migration Logic [checkpoint: 5b2e2ac]
- [x] Task: Remove configuration flag from `main.go` d31a6ea
    - [x] Remove `MigrateContentMarkdown` field from configuration struct
    - [x] Remove usage of `cfg.MigrateContentMarkdown` in `main.go`
- [x] Task: Delete migration files c1124d2
    - [x] Delete `cmd/feed-reader/migrate_md.go`
    - [x] Delete `cmd/feed-reader/migrate_md_test.go`
- [x] Task: Verify build and tests 60d0694
    - [x] Run `go build ./cmd/feed-reader` to ensure no lingering references prevent compilation
    - [x] Run `go test ./cmd/feed-reader/...` to ensure no regressions
- [ ] Task: Conductor - User Manual Verification 'Phase 2: Remove Migration Logic' (Protocol in workflow.md)

## Phase 3: Final Cleanup & Review
- [x] Task: Final Codebase Scan
    - [x] Search for any remaining references to `MIGRATE_CONTENT_MARKDOWN` or `migrateHTMLToMarkdown`
- [ ] Task: Conductor - User Manual Verification 'Phase 3: Final Cleanup & Review' (Protocol in workflow.md)
