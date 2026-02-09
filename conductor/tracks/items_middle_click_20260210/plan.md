# Implementation Plan: items_middle_click_20260210

## Phase 1: Backend API Extension [checkpoint: f953bb7]
Add the `url` field to the Protobuf definition and ensure the backend returns it in the API response.

- [x] Task: Update Protobuf definition 3f3fae8
    - [x] Add `url` field to `item.v1.Item` in `proto/item/v1/item.proto`
    - [x] Run `make gen` to update generated code
- [x] Task: Implement backend logic for `url` field 3f3fae8
    - [x] Update `cmd/feed-reader/converter.go` to map the URL from the DB model to the Protobuf message
    - [x] Verify that existing DB queries already fetch the URL (if not, update `sql/query.sql` and run `make sqlc`)
- [x] Task: Write tests for Backend API 3f3fae8
    - [x] Update `cmd/feed-reader/item_routing_test.go` or similar to verify the `url` field is present in the response
- [x] Task: Conductor - User Manual Verification 'Phase 1: Backend API Extension' (Protocol in workflow.md) f953bb7

## Phase 2: Frontend Implementation
Implement the middle-click handler and mark-as-read logic in the frontend.

- [ ] Task: Update Frontend Mock
    - [ ] Update `frontend/src/gen/item/v1/item_pb.ts` (if not automatically updated)
    - [ ] Update MSW handlers or mock data in `frontend/src/mocks/` to include the `url` field
- [ ] Task: Implement Middle-Click Logic in `ItemRow`
    - [ ] Add `onAuxClick` handler to the item row component in `frontend/src/components/ItemRow.tsx`
    - [ ] Implement logic to open `item.url` in a new tab with `noopener,noreferrer` when `button === 1`
    - [ ] Call the `markAsRead` mutation immediately on middle-click
    - [ ] Prevent event propagation to stop the detail modal from opening
- [ ] Task: Write tests for Frontend
    - [ ] Create/Update `frontend/src/components/ItemRow.test.tsx` to simulate middle-click
    - [ ] Verify `window.open` is called with the correct parameters
    - [ ] Verify the mark-as-read API request is triggered
    - [ ] Verify the detail modal navigation is NOT triggered
- [ ] Task: Conductor - User Manual Verification 'Phase 2: Frontend Implementation' (Protocol in workflow.md)

## Phase 3: Final Verification
Ensure end-to-end functionality and code quality.

- [ ] Task: End-to-End Manual Test
    - [ ] Verify the full flow: middle-click -> new tab opens -> item becomes read in the list
- [ ] Task: Verify Quality Gates
    - [ ] Check test coverage (>80%)
    - [ ] Run linter and type checker
- [ ] Task: Conductor - User Manual Verification 'Phase 3: Final Verification' (Protocol in workflow.md)
