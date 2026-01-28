# Specification: Item List Date Filter Fix and Enhancement

## Overview
This track aims to fix the `BigInt value can't be serialized in JSON` error that occurs when selecting any date filter option other than "All Time" in the item list. Additionally, it will expand the available date filter options to include "Past 90 days" and "Past 365 days".

## Functional Requirements
- **Fix BigInt Serialization Error:**
    - Identify the BigInt value causing the JSON serialization error during item filtering and ensure it is handled correctly (e.g., converted to a string or appropriate format) before serialization.
    - Ensure that API requests from the frontend to the backend correctly serialize date filter parameters.
- **Expand Date Filter Options:**
    - Add "Past 90 days" and "Past 365 days" to the date filter dropdown in the item list.
    - Update both frontend query logic and backend (if necessary) to support these new durations.

## Non-Functional Requirements
- **Type Safety:** Maintain and update TypeScript definitions for the new filter options.
- **TDD Compliance:** Follow the project workflow by using Test-Driven Development (TDD) for both the fix and the new feature.

## Acceptance Criteria
- Selecting "Past 24 hours", "Past 7 days", "Past 30 days", "Past 90 days", or "Past 365 days" no longer triggers a BigInt serialization error.
- The item list is correctly filtered based on the selected duration.
- The "90 days" and "365 days" options are visible and selectable in the date filter dropdown.

## Out of Scope
- Major UI redesign of the date filter selector beyond adding the new options.
- Changes to other filters (e.g., read/unread) not directly related to this fix.
