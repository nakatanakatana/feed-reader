# Implementation Plan - Fix ItemDetailModal Image Click Area

## Phase 1: Analysis & Reproduction
- [x] Task: Analyze `frontend/src/components/ItemDetailModal.tsx` and associated styles to identify the element causing the full-width click area.
- [x] Task: Create a reproduction test case (e.g., in `frontend/src/components/ItemDetailModal.Logic.test.tsx`) that verifies the click handler structure or simulates clicks on the container vs. the image. b189088
    - [x] Define the expected structure where the click handler is attached to the image/wrapper, not the full-width container.
- [ ] Task: Conductor - User Manual Verification 'Phase 1: Analysis & Reproduction' (Protocol in workflow.md)

## Phase 2: Implementation
- [x] Task: Apply CSS/Structure changes to `ItemDetailModal`.
    - [x] Ensure the click target size matches the rendered image size.
    - [x] Maintain existing responsive behavior (centering, scaling).
- [ ] Task: Verify the fix works by running the reproduction test (Green Phase).
- [ ] Task: Conductor - User Manual Verification 'Phase 2: Implementation' (Protocol in workflow.md)

## Phase 3: Final Verification
- [ ] Task: Manually verify the behavior on Desktop (click whitespace -> no action, click image -> action).
- [ ] Task: Manually verify the behavior on Mobile (check layout and interaction).
- [ ] Task: Ensure no regressions in other modal functionality (navigation, closing).
- [ ] Task: Conductor - User Manual Verification 'Phase 3: Final Verification' (Protocol in workflow.md)
