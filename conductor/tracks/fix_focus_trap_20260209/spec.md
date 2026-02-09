# Specification: ItemDetailModal Focus Trap Enhancement

## Overview
This track addresses an issue in the `ItemDetailModal` where the focus is lost to the `<body>` when navigating between items using shortcut keys (Next/Previous). This causes keyboard shortcuts to stop working, interrupting the reading experience. We will implement a robust focus trap and ensure focus is returned to the modal container after each navigation.

## Functional Requirements
- **Focus Retention:** Prevent focus from leaking outside the modal during item transitions.
- **Container Re-focusing:** Automatically return focus to the modal's main container after the `itemId` changes. This ensures that navigation keys (`j`/`k`, arrow keys, etc.) remain active.
- **Continuous Keyboard Navigation:** Ensure that multiple sequential Next/Previous actions can be performed without losing the ability to use keyboard shortcuts.

## Non-Functional Requirements
- **Accessibility:** Adhere to WAI-ARIA Modal patterns by trapping the `Tab` key focus within the modal.
- **Robustness:** Implement a declarative or highly resilient focus management system that is less susceptible to future UI or rendering logic changes.

## Acceptance Criteria
- [ ] When using Next or Previous shortcuts in `ItemDetailModal`, the next item is loaded and keyboard shortcuts remain functional.
- [ ] After an item transition, the browser focus (`document.activeElement`) is either on the modal container itself or a suitable element within it.
- [ ] Pressing the `Tab` key repeatedly does not move the focus outside the modal to the background page.

## Out of Scope
- Focus management outside of `ItemDetailModal`.
- Any visual design changes to the modal that are not related to focus management.
