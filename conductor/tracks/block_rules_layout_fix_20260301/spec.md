# Specification: block_rules_layout_fix

## Overview
Address frontend test failures and lint errors resulting from the manual layout adjustments in `frontend/src/routes/block-rules.tsx`, and update snapshots as necessary.

## Functional Requirements
- Fix or update frontend tests (Vitest, etc.) based on the current implementation of `frontend/src/routes/block-rules.tsx`.
- Resolve Biome lint and formatting errors.
- Update Vitest snapshots to reflect the modified layout.

## Non-Functional Requirements
- Adhere to the project's code style guidelines (Biome configuration).
- Ensure that the functional aspects of the component (filtering, adding rules, etc.) remain operational.

## Acceptance Criteria
- `npm run lint` completes without errors.
- `npm test` (frontend-related) passes all tests.
- Updated snapshots are accurate and reflect the intentional layout changes.

## Out of Scope
- Further layout changes or addition of new features.
- Backend logic modifications.
