# Specification: Rename Feed columns (uuid -> id, language -> lang)

## Overview
Update the application code across all layers (Go backend and TypeScript frontend) to align with the renamed columns in the `feeds` table: `uuid` to `id` and `language` to `lang`. 
Since the database schema, Protobuf definitions, and their corresponding generated codes have already been updated, this track focuses on fixing the existing application logic and test codes that reference the old field names.

## Functional Requirements
- **Go Backend Updates**
    - Update field references from `Uuid` to `Id` and `Language` to `Lang` in the `Feed` struct and related logic.
    - Adjust database interaction code to use the new names provided by the updated `sqlc` generated code.
    - Update all backend tests (unit and integration tests) to ensure they pass with the new field names.
- **TypeScript Frontend Updates**
    - Update property references from `uuid` to `id` and `language` to `lang` in the `Feed` type and related components.
    - Adjust API calls (TanStack Query), routing logic, and state management to use the new names.
    - Update all frontend tests (Vitest) to ensure they pass with the new property names.

## Non-Functional Requirements
- Maintain code readability and consistency.
- Ensure no functional changes occur apart from the renaming (pure refactoring).

## Acceptance Criteria
- Go backend builds successfully, and all tests (`go test ./...`) pass.
- TypeScript frontend builds successfully, and all tests (`npm run test`) pass.
- Re-running code generation tools (`sqlc`, `buf`) results in no further inconsistencies.

## Out of Scope
- Any other column changes or new feature additions unrelated to this renaming.
- Execution of database migrations (assumed to be already applied).
