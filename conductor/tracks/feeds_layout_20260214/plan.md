# Implementation Plan - Feeds Layout Refinement

This plan focuses on optimizing the `/feeds` page layout for small screens by repositioning the `Import OPML` button and reducing vertical whitespace.

## Phase 1: Preparation and UI Component Adjustment
Refactor `AddFeedForm` to handle the `Import OPML` button more efficiently and adjust its layout.

- [ ] Task: Adjust `AddFeedForm` layout and responsive button behavior
    - [ ] Modify `AddFeedForm.tsx` to support a responsive display for `headerActions` (icon-only on mobile).
    - [ ] Update `AddFeedForm.test.tsx` to verify the new layout and responsive behavior.
- [ ] Task: Update `/feeds` route layout
    - [ ] Modify `frontend/src/routes/feeds.tsx` to remove the `<hr />` separator.
    - [ ] Adjust spacing between `AddFeedForm` and `FeedList` using Panda CSS.
- [ ] Task: Conductor - User Manual Verification 'Phase 1' (Protocol in workflow.md)

## Phase 2: Final Polishing and Verification
Ensure the layout is consistent and performant across devices.

- [ ] Task: Fine-tune Panda CSS styles for information density
    - [ ] Adjust margins and paddings in `AddFeedForm` and the main container in `feeds.tsx`.
- [ ] Task: Verify responsiveness on mobile screen sizes
    - [ ] Use Vitest Browser Mode or manual check to ensure the `Import OPML` button becomes an icon on narrow screens.
- [ ] Task: Conductor - User Manual Verification 'Phase 2' (Protocol in workflow.md)
