# Track: Improve Bulk Mark as Read Performance

## Overview
This track addresses a performance bottleneck in the frontend `ItemList` when a large number of items (1,000+) are marked as read simultaneously. Users report that the browser completely freezes for several seconds before the actual network request is sent.

## Problem Statement
The current client-side processing logic for bulk marking items as read is likely performing expensive operations (e.g., state updates, DOM recalculations, or heavy iterative logic) in a single synchronous block, causing the main thread to hang.

## Functional Requirements
- **Maintain Current Behavior:** The core functionality (marking items as read/unread) must remain unchanged.
- **Bulk Action:** Support marking 1,000+ items as read without freezing the UI.

## Non-Functional Requirements
- **Performance:** The UI should remain responsive (at least showing a loading state or progress) during the processing phase.
- **Responsiveness:** Eliminate the "complete freeze" behavior reported by users.
- **Maintainability:** Ensure that the optimization doesn't introduce excessive complexity or side effects.

## Acceptance Criteria
- [ ] Marking 1,000+ items as read should not cause the UI to freeze for more than 100ms.
- [ ] A loading indicator or progress feedback is displayed immediately after the user triggers the "Mark as read" action.
- [ ] The items are correctly updated in the local state (TanStack DB/Solid Store) and on the backend.
- [ ] The fix is validated via performance profiling and automated tests.

## Out of Scope
- Backend API optimizations (unless client-side optimization is proven insufficient).
- UI/UX redesign of the bulk selection bar.