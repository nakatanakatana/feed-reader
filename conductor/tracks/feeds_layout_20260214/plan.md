# Implementation Plan - Feeds Layout Refinement

This plan focuses on optimizing the `/feeds` page layout for small screens by repositioning the `Import OPML` button and reducing vertical whitespace.

## Phase 1: Preparation and UI Component Adjustment [checkpoint: 1f76a6f]
Refactor `AddFeedForm` to handle the `Import OPML` button more efficiently and adjust its layout.

- [x] Task: Adjust `AddFeedForm` layout and responsive button behavior (1f76a6f)
    - [x] Modify `AddFeedForm.tsx` to support a responsive display for `headerActions` (icon-only on mobile).
    - [x] Update `AddFeedForm.test.tsx` to verify the new layout and responsive behavior.
- [x] Task: Update `/feeds` route layout (1f76a6f)
    - [x] Modify `frontend/src/routes/feeds.tsx` to remove the `<hr />` separator.
    - [x] Adjust spacing between `AddFeedForm` and `FeedList` using Panda CSS.
- [x] Task: Conductor - User Manual Verification 'Phase 1' (Protocol in workflow.md) (1f76a6f)

## Phase 2: Final Polishing and Verification [checkpoint: de84768]
Ensure the layout is consistent and performant across devices.

- [x] Task: Fine-tune Panda CSS styles for information density (1f76a6f)
    - [x] Adjust margins and paddings in `AddFeedForm` and the main container in `feeds.tsx`.
- [x] Task: Verify responsiveness on mobile screen sizes (1f76a6f)
    - [x] Use Vitest Browser Mode or manual check to ensure the `Import OPML` button becomes an icon on narrow screens.
- [x] Task: Conductor - User Manual Verification 'Phase 2' (Protocol in workflow.md) (de84768)
