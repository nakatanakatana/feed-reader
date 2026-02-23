# Specification: Fix Bulk Domain Block Registration

## Overview
Bulk registration of item block rules with `type=domain` currently results in the `domain` column being empty in the `item_block_rules` table, even though the domain is correctly captured in the `rule_value` (or `value` in the frontend) column. This causes domain-based blocking to fail or behave unexpectedly.

## Functional Requirements
- **Accurate Data Persistence:** When registering domain block rules in bulk (via CSV or manual text input), the `domain` field in the database must be correctly populated with the domain name.
- **Frontend Validation & Mapping:** The frontend bulk registration form must correctly map the input values to the corresponding fields (`rule_type`, `rule_value`, and `domain`) before sending the request to the backend.
- **Backend Consistency:** The backend API for bulk block rule registration must ensure that the `domain` field is correctly handled, especially for `rule_type='domain'`.

## Non-Functional Requirements
- **Test Coverage:** Unit tests must be added to both the frontend and backend to verify the correct handling of domain block rules during bulk registration.

## Acceptance Criteria
- Registering a rule with `type=domain` and `value=example.com` via the bulk registration UI results in a record in `item_block_rules` where:
    - `rule_type` = `domain`
    - `rule_value` = `example.com`
    - `domain` = `example.com`
- All existing block rules (keyword, user) continue to function correctly.
- Automated tests pass, confirming the fix.

## Out of Scope
- Redesigning the bulk registration UI.
- Performance tuning of the block filtering logic.
