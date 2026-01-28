# Implementation Plan: Item List Date Filter Fix and Enhancement

## Phase 1: Fix BigInt Serialization Error
Focus on identifying and fixing the BigInt serialization issue when applying date filters.

- [ ] Task: Reproduce the BigInt serialization error with a Vitest unit test in `frontend/src/lib/item-query.test.ts` or similar.
- [ ] Task: Locate the BigInt value in the frontend state or API request payload and ensure it is serialized correctly (e.g., as a string for Connect RPC).
- [ ] Task: Verify the fix by running the reproduction test and ensuring it passes.
- [ ] Task: Conductor - User Manual Verification 'Phase 1: Fix BigInt Serialization Error' (Protocol in workflow.md)

## Phase 2: Expand Date Filter Options
Add "90 days" and "365 days" options to the date filter.

- [ ] Task: Update the type definitions and constants for date filters in the frontend.
- [ ] Task: Write tests in `frontend/src/components/DateFilterSelector.test.tsx` to verify the new options are rendered.
- [ ] Task: Implement the "90 days" and "365 days" options in `frontend/src/components/DateFilterSelector.tsx`.
- [ ] Task: Write tests in `frontend/src/lib/item-utils.test.ts` to ensure the correct timestamps are calculated for the new durations.
- [ ] Task: Update the filtering logic to handle the new durations.
- [ ] Task: Conductor - User Manual Verification 'Phase 2: Expand Date Filter Options' (Protocol in workflow.md)

## Phase 3: Verification and Quality Assurance
Final checks to ensure everything works correctly and adheres to project standards.

- [ ] Task: Run all frontend tests (`npm test`) to ensure no regressions.
- [ ] Task: Run Biome linting and formatting checks (`npm run lint`).
- [ ] Task: Verify the entire flow manually in the browser.
- [ ] Task: Conductor - User Manual Verification 'Phase 3: Verification and Quality Assurance' (Protocol in workflow.md)
