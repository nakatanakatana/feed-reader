# Implementation Plan: Bulk Registration for Item Block Rules

## Phase 1: Core Logic & Parsing [checkpoint: 63f04d3]
- [x] Task: Write unit tests for CSV parsing logic (handling comma, rule types, invalid lines). 2441809
- [x] Task: Implement the CSV parsing utility in the frontend. 2441809
- [x] Task: Conductor - User Manual Verification 'Phase 1: Core Logic' (Protocol in workflow.md) f6a24a6

## Phase 2: UI Foundation & Input
- [x] Task: Add "Bulk Add" button to the Block Rules page next to the existing "Add" button. 6f1fe49
- [x] Task: Implement the Modal component with text area and file upload inputs. aa9ea2d
- [x] Task: Write integration tests for the input and parsing workflow in the UI. aa9ea2d
- [x] Task: Implement the interactive parsing logic and preview table display in the modal. aa9ea2d
- [~] Task: Conductor - User Manual Verification 'Phase 2: UI Foundation' (Protocol in workflow.md)

## Phase 3: Backend Integration & Polish
- [~] Task: Implement the submission logic using the existing `AddItemBlockRules` RPC.
- [ ] Task: Add feedback UI (success summary, skipped lines report) and automatic list refresh.
- [ ] Task: Final visual adjustments and mobile responsiveness check.
- [ ] Task: Conductor - User Manual Verification 'Phase 3: Integration & Polish' (Protocol in workflow.md)
