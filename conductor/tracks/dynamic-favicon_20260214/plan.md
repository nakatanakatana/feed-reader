# Implementation Plan - Dynamic Favicon

## Phase 1: Core Logic & Utilities [checkpoint: 9553748]
- [x] Task: Implement Color Tier Logic 034607c
    - [x] Create `frontend/src/lib/favicon.test.ts` to test tier thresholds (0, 1-10, 11-50, 51+).
    - [x] Implement `frontend/src/lib/favicon.ts` with `getFaviconColor(count)` and constant definitions.
- [x] Task: Implement SVG Manipulation Utility 35edab3
    - [x] Update `frontend/src/lib/favicon.test.ts` to test SVG string generation/replacement.
    - [x] Implement `generateFaviconUri(color)` in `frontend/src/lib/favicon.ts` (using a template string for the SVG).
- [x] Task: Conductor - User Manual Verification 'Core Logic & Utilities' (Protocol in workflow.md)

## Phase 2: SolidJS Integration [checkpoint: a903183]
- [x] Task: Create DynamicFavicon Component/Hook f97bb72
    - [x] Create `frontend/src/components/AddFeedForm.test.tsx` (Note: should have been DynamicFavicon.test.tsx, correcting in implementation).
    - [x] Implement `frontend/src/components/DynamicFavicon.tsx` which accepts `unreadCount` as a prop and updates the document head.
    - [x] Ensure it handles cleanup (restoring default) if unmounted.
- [x] Task: Conductor - User Manual Verification 'SolidJS Integration' (Protocol in workflow.md) a903183

## Phase 3: Application Wiring
- [ ] Task: Connect to Application State
    - [ ] Identify global unread count source (likely in a Store or Context).
    - [ ] Instantiate `<DynamicFavicon />` in the root provider or Main Layout.
    - [ ] Pass the real reactive unread count to the component.
- [ ] Task: Conductor - User Manual Verification 'Application Wiring' (Protocol in workflow.md)
