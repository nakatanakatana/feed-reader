# Implementation Plan - Bundle Frontend

## Phase 1: Preparation & Build Config [checkpoint: eb20ef6]
This phase focuses on ensuring the frontend can be built correctly and the build process is integrated.

- [x] Task: Ensure frontend build produces expected output e9a1a42
    - [ ] Create a `frontend_build_test.sh` script to run `npm run build` and verify `frontend/dist/index.html` exists.
- [x] Task: Update Makefile to coordinate builds 248d25c
    - [ ] Modify `Makefile` to ensure `build-frontend` runs before `build-backend` in the `build` target.
    - [ ] Add `clean` target to remove `frontend/dist` and `dist/`.
- [x] Task: Conductor - User Manual Verification 'Preparation & Build Config' (Protocol in workflow.md)

## Phase 2: Go Backend Implementation (TDD)
This phase implements the embedding and serving logic in the Go backend.

- [ ] Task: Create Static Assets Handler (TDD)
    - [ ] Create `cmd/feed-reader/assets_test.go` to test the file server logic (mocking `embed.FS`).
        - [ ] Test serving an existing file.
        - [ ] Test SPA fallback (requesting non-existent file returns `index.html`).
        - [ ] Test that `/api` routes are NOT handled by this handler.
    - [ ] Create `cmd/feed-reader/assets.go` to implement the handler using `embed` and `http.FileServer`.
        - [ ] Define `//go:embed frontend/dist/*` directive.
        - [ ] Implement a wrapper handler for SPA fallback logic.
- [ ] Task: Integrate Handler into Main Server
    - [ ] Modify `cmd/feed-reader/main.go` to mount the static assets handler.
        - [ ] Ensure it's mounted at `/` but does not conflict with `/api`.
        - [ ] Use a build tag or configuration to allow disabling it during dev if necessary (though simple coexistence is preferred).
- [ ] Task: Conductor - User Manual Verification 'Go Backend Implementation' (Protocol in workflow.md)

## Phase 3: Verification & Cleanup
This phase verifies the final artifact and cleans up.

- [ ] Task: Verify Single Binary
    - [ ] Run `make build`.
    - [ ] Start the binary from `dist/`.
    - [ ] Verify UI loads at root.
    - [ ] Verify API works.
    - [ ] Verify refresh on a sub-route works.
- [ ] Task: Documentation
    - [ ] Update `README.md` (if applicable) to mention the single binary distribution.
- [ ] Task: Conductor - User Manual Verification 'Verification & Cleanup' (Protocol in workflow.md)
