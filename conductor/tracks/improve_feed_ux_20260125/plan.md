# Plan: Improve Feed Management UX

## Phase 1: Remove Feed Items from Feed Pages (Frontend) [checkpoint: 1203892]
- [x] Task: Remove article list display from `FeedList.tsx`. Ensure only the list of feeds is shown.
- [x] Task: Remove article list display from `feeds.$feedId.tsx`. Ensure only feed details/stats are shown. [b903018]
- [x] Task: Conductor - User Manual Verification 'Remove Feed Items from Feed Pages' (Protocol in workflow.md)

## Phase 2: Backend Support for Bulk Tagging [checkpoint: 2eb9d4a]
- [x] Task: Update `sql/query.sql` to include `DeleteFeedTag` (delete specific tag from feed). [0f926a9]
- [x] Task: Update `proto/feed/v1/feed.proto` to add `ManageFeedTags` RPC (feed_ids, add_tag_ids, remove_tag_ids). [61027b0]
- [x] Task: Run `make gen` to generate Go and TypeScript code. [61027b0]
- [x] Task: Update `store` package to support bulk tag management (transactional add/remove). [63d2eef]
- [x] Task: Implement `ManageFeedTags` handler in `cmd/feed-reader/handler.go`. [55b3688]
- [x] Task: Add unit/integration tests for `ManageFeedTags` in `cmd/feed-reader/handler_test.go` or `store/feed_store_test.go`. [55b3688]
- [x] Task: Conductor - User Manual Verification 'Backend Support for Bulk Tagging' (Protocol in workflow.md)

## Phase 3: Bulk Tagging UI (Frontend)
- [x] Task: Create `ManageTagsModal.tsx` component. [dac7d31]
    - [ ] Sub-task: UI layout (list of tags, add/remove indication).
    - [ ] Sub-task: Logic to handle selection state (which tags to add/remove).
- [ ] Task: Update `FeedList.tsx` to support bulk selection.
    - [ ] Sub-task: Add checkboxes to feed rows.
    - [ ] Sub-task: Add "Manage Tags" button (disabled if 0 selected).
    - [ ] Sub-task: Connect "Manage Tags" button to open the modal.
- [ ] Task: Integrate `ManageFeedTags` RPC in the frontend.
    - [ ] Sub-task: Call RPC from `ManageTagsModal` on save.
    - [ ] Sub-task: Invalidate queries to refresh feed list/tags.
- [ ] Task: Add tests for `ManageTagsModal` and `FeedList` interaction.
- [ ] Task: Conductor - User Manual Verification 'Bulk Tagging UI' (Protocol in workflow.md)
