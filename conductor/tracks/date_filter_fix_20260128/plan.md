# Implementation Plan: Item List Date Filter Fix and Enhancement

## Phase 1: Fix BigInt Serialization Error [checkpoint: 3ee18c3]
Focus on identifying and fixing the BigInt serialization issue when applying date filters.

- [x] Task: Reproduce the BigInt serialization error with a Vitest unit test in `frontend/src/lib/item-query.test.ts` or similar. [a3bb21a]
- [x] Task: Locate the BigInt value in the frontend state or API request payload and ensure it is serialized correctly (e.g., as a string for Connect RPC). [a3bb21a]
- [x] Task: Verify the fix by running the reproduction test and ensuring it passes. [a3bb21a]
- [ ] Task: Conductor - User Manual Verification 'Phase 1: Fix BigInt Serialization Error' (Protocol in workflow.md)

## Phase 2: Expand Date Filter Options [checkpoint: eaa3818]
Add "90 days" and "365 days" options to the date filter.

- [x] Task: Update the type definitions and constants for date filters in the frontend. [929f4e7]
- [x] Task: Write tests in `frontend/src/components/DateFilterSelector.test.tsx` to verify the new options are rendered. [929f4e7]
- [x] Task: Implement the "90 days" and "365 days" options in `frontend/src/components/DateFilterSelector.tsx`. [929f4e7]
- [x] Task: Write tests in `frontend/src/lib/item-utils.test.ts` to ensure the correct timestamps are calculated for the new durations. [929f4e7]
- [x] Task: Update the filtering logic to handle the new durations. [929f4e7]
- [ ] Task: Conductor - User Manual Verification 'Phase 2: Expand Date Filter Options' (Protocol in workflow.md)

## Phase 3: Verification and Quality Assurance [checkpoint: aba9b8c]
Final checks to ensure everything works correctly and adheres to project standards.

- [x] Task: Run all frontend tests (`npm test`) to ensure no regressions. [eaa3818]
- [x] Task: Run Biome linting and formatting checks (`npm run lint`). [99abeb0]
- [x] Task: Verify the entire flow manually in the browser. [8b38fec]
- [ ] Task: Conductor - User Manual Verification 'Phase 3: Verification and Quality Assurance' (Protocol in workflow.md)
