# Implementation Plan: Item Domain Metadata Display

## Phase 1: Research and Setup
- [ ] Task: Identify the location of `ItemDetailModal` in the frontend codebase.
- [ ] Task: Analyze the existing metadata display in `ItemDetailModal` and its subcomponents.
- [ ] Task: Identify where to place the new domain extraction utility.

## Phase 2: Domain Extraction Utility
- [ ] Task: Write tests for the domain extraction utility function (`extractHostname`).
- [ ] Task: Implement the `extractHostname` utility function to return the full hostname from a URL.
- [ ] Task: Conductor - User Manual Verification 'Domain Extraction Utility' (Protocol in workflow.md)

## Phase 3: UI Implementation in ItemDetailModal
- [ ] Task: Write failing integration tests for `ItemDetailModal` verifying the new domain metadata item is present in the DOM.
- [ ] Task: Integrate `extractHostname` into `ItemDetailModal` or its relevant metadata component.
- [ ] Task: Implement the UI for the domain metadata (text + icon) within the metadata row.
- [ ] Task: Apply secondary styling (font size, color) to match requirements.
- [ ] Task: Verify the domain is NOT a clickable link.
- [ ] Task: Conductor - User Manual Verification 'UI Implementation in ItemDetailModal' (Protocol in workflow.md)

## Phase 4: Final Verification and Polishing
- [ ] Task: Run all frontend tests and ensure >80% coverage for new code.
- [ ] Task: Manually verify the layout and appearance on both desktop and narrow viewports (< 480px).
- [ ] Task: Conductor - User Manual Verification 'Final Verification and Polishing' (Protocol in workflow.md)
