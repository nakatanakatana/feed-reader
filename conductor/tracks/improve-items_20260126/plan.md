# Plan: Improve Item List and Detail View

## Phase 1: Deep Linking & Enhanced Modal UI
Focus: Making the item detail view a first-class citizen with its own URL and improved responsive layout.

- [x] Task: Implement Item Detail Routing (Deep Linking) 2d4ed1a
    - [ ] Write Failing Tests (Red): Create tests for route matching and URL parameter extraction for item details.
    - [ ] Implement to Pass Tests (Green): Define new routes (e.g., `/items/$itemId`) or child routes using TanStack Router. Ensure navigating to this URL opens the modal.
    - [ ] Refactor: Optimize route definitions and loader data pre-fetching.
    - [ ] Verify Coverage: Ensure route transitions are covered.
- [x] Task: Implement Responsive Modal Design 434fe4e
    - [ ] Write Failing Tests (Red): Create visual regression or component tests checking modal dimensions on different viewports.
    - [ ] Implement to Pass Tests (Green): Update `ItemDetailModal` styling.
        - Desktop: 80-90% width/height.
        - Mobile: Fullscreen (100% width/height).
    - [ ] Refactor: Extract shared layout styles if necessary.
    - [ ] Verify Coverage: Verify styling logic via tests.
- [ ] Task: Conductor - User Manual Verification 'Deep Linking & Enhanced Modal UI' (Protocol in workflow.md)

## Phase 2: Navigation & Auto-Read Logic
Focus: Streamlining the reading experience with intuitive navigation and smart read-status management.

- [ ] Task: Implement In-Modal Navigation
    - [ ] Write Failing Tests (Red): Create tests for "Next" and "Previous" actions, ensuring they calculate the correct adjacent item ID.
    - [ ] Implement to Pass Tests (Green): Add UI buttons and keyboard shortcuts (e.g., Arrow keys, J/K) to switch items without closing the modal.
    - [ ] Refactor: Optimize the logic for finding adjacent items within the current list context.
    - [ ] Verify Coverage: Test navigation at list boundaries (first/last items).
- [ ] Task: Implement Auto-Mark as Read on Navigation
    - [ ] Write Failing Tests (Red): Mock the API and assert `markAsRead` is called for *Item A* when navigating from *Item A* to *Item B*.
    - [ ] Implement to Pass Tests (Green): Hook into the navigation event to trigger the status update for the previous item.
    - [ ] Refactor: Ensure clean separation between navigation state and side-effects.
    - [ ] Verify Coverage: Verify network calls in tests.
- [ ] Task: Conductor - User Manual Verification 'Navigation & Auto-Read Logic' (Protocol in workflow.md)

## Phase 3: Bulk Actions (Select & Mark Read)
Focus: Improving efficiency for managing large numbers of items.

- [ ] Task: Implement Item Selection State & UI
    - [ ] Write Failing Tests (Red): Test selection logic (toggle single, toggle all, selection count).
    - [ ] Implement to Pass Tests (Green): Add checkboxes to `ItemRow` and a global selection state management (likely in a Store or Context).
    - [ ] Refactor: Ensure performance is maintained when selecting large lists.
    - [ ] Verify Coverage: Test interaction with filters (selecting all should only select visible items).
- [ ] Task: Implement Bulk Mark as Read Action
    - [ ] Write Failing Tests (Red): Test that the "Mark as Read" action sends the correct list of IDs to the backend.
    - [ ] Implement to Pass Tests (Green): Add the UI button and connect it to the API.
    - [ ] Refactor: Improve error handling and optimistic UI updates for bulk operations.
    - [ ] Verify Coverage: Verify API payload and state updates.
- [ ] Task: Conductor - User Manual Verification 'Bulk Actions' (Protocol in workflow.md)
