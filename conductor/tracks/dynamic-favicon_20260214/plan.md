# Implementation Plan - Dynamic Favicon

## Phase 1: Core Logic & Utilities
- [ ] Task: Implement Color Tier Logic
    - [ ] Create `frontend/src/lib/favicon.test.ts` to test tier thresholds (0, 1-10, 11-50, 51+).
    - [ ] Implement `frontend/src/lib/favicon.ts` with `getFaviconColor(count)` and constant definitions.
- [ ] Task: Implement SVG Manipulation Utility
    - [ ] Update `frontend/src/lib/favicon.test.ts` to test SVG string generation/replacement.
    - [ ] Implement `generateFaviconUri(color)` in `frontend/src/lib/favicon.ts` (using a template string for the SVG).
- [ ] Task: Conductor - User Manual Verification 'Core Logic & Utilities' (Protocol in workflow.md)

## Phase 2: SolidJS Integration
- [ ] Task: Create DynamicFavicon Component/Hook
    - [ ] Create `frontend/src/components/DynamicFavicon.test.tsx`.
    - [ ] Implement `frontend/src/components/DynamicFavicon.tsx` which accepts `unreadCount` as a prop and updates the document head.
    - [ ] Ensure it handles cleanup (restoring default) if unmounted.
- [ ] Task: Conductor - User Manual Verification 'SolidJS Integration' (Protocol in workflow.md)

## Phase 3: Application Wiring
- [ ] Task: Connect to Application State
    - [ ] Identify global unread count source (likely in a Store or Context).
    - [ ] Instantiate `<DynamicFavicon />` in the root provider or Main Layout.
    - [ ] Pass the real reactive unread count to the component.
- [ ] Task: Conductor - User Manual Verification 'Application Wiring' (Protocol in workflow.md)
