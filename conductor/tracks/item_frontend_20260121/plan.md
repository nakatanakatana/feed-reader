# Implementation Plan: Item Fetching and Display Frontend

Implement the frontend components and logic for listing items, filtering by feed, and managing item status according to the `spec.md`.

## Phase 1: Foundation & Data Access [checkpoint: 32f2efc]
Setup the necessary queries and basic state management for items.

- [x] Task: Define Item query keys and basic fetching logic using TanStack Query and ItemService.ListItems. 1eb0934
- [x] Task: Implement useItems hook to handle fetching, pagination (load more), and filtering by feed_id. aae7160
- [x] Task: Implement useUpdateItemStatus mutation hook using ItemService.UpdateItemStatus. 1066deb
- [ ] Task: Conductor - User Manual Verification 'Phase 1: Foundation & Data Access' (Protocol in workflow.md)

## Phase 2: Item List Components
Create the UI components for displaying items in a list view.

- [x] Task: Create ItemRow component for the list view, displaying title, metadata, and read status toggle. dbaf85a
- [ ] Task: Implement "Mark as Read/Unread" toggle logic in `ItemRow`.
- [ ] Task: Implement "Open URL" functionality in `ItemRow`.
- [ ] Task: Create `ItemList` component that renders a list of `ItemRow`s and the "Load More" button.
- [ ] Task: Conductor - User Manual Verification 'Phase 2: Item List Components' (Protocol in workflow.md)

## Phase 3: Routing & Views
Integrate the item list into the application's routing.

- [ ] Task: Update the "All Items" view (e.g., `feeds.tsx` or a new index route) to use `ItemList`.
- [ ] Task: Update the "Feed Specific" view to pass the `feed_id` from the URL to `ItemList`.
- [ ] Task: Ensure navigation between different feeds updates the item list correctly.
- [ ] Task: Conductor - User Manual Verification 'Phase 3: Routing & Views' (Protocol in workflow.md)

## Phase 4: Refinement & Mobile Optimization
Polish the UI and ensure it works well on all devices.

- [ ] Task: Apply styling using Panda CSS to ensure the list view is clean and responsive.
- [ ] Task: Add loading and error states for the item list and "Load More" action.
- [ ] Task: Verify touch targets and responsiveness on mobile-sized viewports.
- [ ] Task: Conductor - User Manual Verification 'Phase 4: Refinement & Mobile Optimization' (Protocol in workflow.md)
