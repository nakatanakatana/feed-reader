# Implementation Plan: Feed Management Screen Improvements

## Phase 1: Filtering and Sorting [checkpoint: 86f9782]
- [x] Task: Implement "Uncategorized" filter 7013b0b
    - [x] Write tests for filtering feeds with no tags in `FeedList.test.tsx`
    - [x] Add "Uncategorized" button and update filter logic in `FeedList.tsx`
- [x] Task: Implement sorting functionality 371ec3b
    - [x] Write tests for various sort orders (Title, Date Added, Last Fetched) in `FeedList.test.tsx`
    - [x] Add Sort dropdown and sorting implementation in `FeedList.tsx`
- [x] Task: Conductor - User Manual Verification 'Phase 1: Filtering and Sorting' (Protocol in workflow.md) 86f9782

## Phase 2: UI Interactions and Navigation
- [x] Task: Implement card click selection c49545e
    - [x] Write tests for toggling selection via card background click in `FeedList.test.tsx`
    - [x] Update `FeedList.tsx` to handle card-level click events without interfering with buttons/links
- [ ] Task: Update navigation links
    - [ ] Write tests for external title link and internal detail icon in `FeedList.test.tsx`
    - [ ] Update feed title to open external `link` in new tab
    - [ ] Add internal detail icon for navigating to `/feeds/$feedId`
- [ ] Task: Conductor - User Manual Verification 'Phase 2: UI Interactions and Navigation' (Protocol in workflow.md)
