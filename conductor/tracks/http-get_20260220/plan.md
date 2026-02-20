# Implementation Plan: Enable HTTP GET for Idempotent RPCs

## Phase 1: Research & Audit
In this phase, we will identify all the RPC methods that are side-effect-free and can be safely moved to HTTP GET.

- [x] Task: Audit `proto/feed/v1/*.proto` to identify read-only methods.
- [x] Task: Audit `proto/item/v1/*.proto` to identify read-only methods.
- [x] Task: Audit `proto/tag/v1/*.proto` to identify read-only methods.
- [x] Task: Audit Go backend handlers (`cmd/feed-reader/handler.go`, `cmd/feed-reader/item_handler.go`, `cmd/feed-reader/tag_service.go`) to confirm methods are truly idempotent.
- [x] Task: Conductor - User Manual Verification 'Phase 1: Research & Audit' (Protocol in workflow.md) [45464f6]

## Phase 2: Protobuf Updates & Generation
In this phase, we will update the Protobuf definitions and regenerate the code for both the backend and frontend.

- [ ] Task: Update `proto/feed/v1/feed.proto` with `idempotency_level = IDEMPOTENT` for identified methods.
- [ ] Task: Update `proto/item/v1/item.proto` with `idempotency_level = IDEMPOTENT` for identified methods.
- [ ] Task: Update `proto/tag/v1/tag.proto` with `idempotency_level = IDEMPOTENT` for identified methods.
- [ ] Task: Regenerate code using `buf generate`.
- [ ] Task: Conductor - User Manual Verification 'Phase 2: Protobuf Updates & Generation' (Protocol in workflow.md)

## Phase 3: Frontend Implementation & Configuration
In this phase, we will configure the Connect-Web frontend to utilize the newly enabled HTTP GET support.

- [ ] Task: Locate the Connect-Web transport initialization in `frontend/src/`.
- [ ] Task: Update the transport configuration to include `useHttpGet: true`.
- [ ] Task: Verify that the frontend application still functions correctly with the change.
- [ ] Task: Conductor - User Manual Verification 'Phase 3: Frontend Implementation & Configuration' (Protocol in workflow.md)

## Phase 4: Verification & Automated Testing
In this phase, we will add tests to ensure that the correct HTTP methods are being used and verify the functionality.

- [ ] Task: Add/Update frontend integration tests using MSW to verify that idempotent RPC calls use the `GET` method.
- [ ] Task: Verify that non-idempotent RPC calls continue to use the `POST` method.
- [ ] Task: Perform manual verification using browser developer tools to confirm `GET` request usage and correct parameter serialization.
- [ ] Task: Conductor - User Manual Verification 'Phase 4: Verification & Automated Testing' (Protocol in workflow.md)
