# Plan: Replace JSDOM with Vitest Browser Mode

## Phase 1: Environment Setup
- [x] Task: Install Playwright and configure Vitest Browser Mode dependencies.
- [x] Task: Update `frontend/vite.config.js` to enable browser mode with Playwright provider and Chromium.
- [x] Task: Remove `jsdom` from `frontend/package.json` and uninstall it.
- [x] Task: Create a simple "smoke test" to verify that Vitest can successfully launch Chromium and run a basic DOM test.
- [x] Task: Conductor - User Manual Verification 'Phase 1: Environment Setup' (Protocol in workflow.md)

## Phase 2: Test Migration [checkpoint: b003adf]
- [x] Task: Update `frontend/vitest-setup.ts` if any `jsdom`-specific globals or mocks need to be adjusted for a real browser environment. [checkpoint: 0e2da2e]
- [x] Task: Migrate and verify `frontend/src/components/AddFeedForm.test.tsx`. [checkpoint: 0e2da2e]
- [x] Task: Migrate and verify `frontend/src/components/FeedList.test.tsx`. [checkpoint: 0e2da2e]
- [x] Task: Migrate and verify `frontend/src/lib/query.test.ts`. [checkpoint: 0e2da2e]
- [x] Task: Migrate and verify `frontend/src/lib/transport-context.test.tsx`. [checkpoint: 0e2da2e]
- [x] Task: Conductor - User Manual Verification 'Phase 2: Test Migration' (Protocol in workflow.md)

## Phase 3: Finalization
- [ ] Task: Audit `frontend/package.json` scripts to ensure `npm test` runs correctly in headless mode.
- [ ] Task: Remove any remaining `jsdom` references or workarounds in the codebase.
- [ ] Task: Run full test suite and verify all tests pass in Chromium.
- [ ] Task: Conductor - User Manual Verification 'Phase 3: Finalization' (Protocol in workflow.md)
