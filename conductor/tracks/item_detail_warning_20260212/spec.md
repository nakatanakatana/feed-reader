# Track Specification: Resolve SolidJS Warning in ItemDetailModal

## Overview
Address a console warning: `computations created outside a createRoot or render will never be disposed` that occurs in development mode when navigating between items in the `ItemDetailModal` using keyboard shortcuts ('j' or 'k'). 

This warning indicates that SolidJS reactive computations (like `createMemo` or `createEffect`) are being instantiated outside a proper reactive owner context, which can lead to memory leaks and unexpected behavior.

## Investigation Areas
- `frontend/src/components/ItemDetailModal.tsx`: Check keyboard event handlers and navigation logic.
- `frontend/src/components/ItemDetailRouteView.tsx`: Inspect how item data is passed and updated.
- `frontend/src/components/MarkdownRenderer.tsx`: Verify if content parsing triggers new computations on every update.
- Any async operations or event listeners that might be creating reactive roots implicitly.

## Functional Requirements
- Eliminate the "computations created outside a createRoot" warning during keyboard navigation.
- Ensure all reactive elements within `ItemDetailModal` (article parsing, navigation state, etc.) are properly disposed of when the modal is closed or items are switched.

## Non-Functional Requirements
- Maintain existing keyboard navigation performance and behavior ('j'/'k' for next/prev, 'Escape' for close).
- No regressions in article rendering (Markdown to HTML conversion).

## Acceptance Criteria
- [ ] In development mode, no SolidJS "dispose" warnings appear in the console when repeatedly using 'j' or 'k' to switch items.
- [ ] Article content renders correctly after each navigation step.
- [ ] Memory usage remains stable (no leaked computations) after opening and closing the modal multiple times.

## Out of Scope
- General UI redesign of the `ItemDetailModal`.
- Fixing unrelated bugs in other components.
