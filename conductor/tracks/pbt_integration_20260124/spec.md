# Specification: Introduction of Property-Based Testing (PBT)

## Overview
The goal of this track is to integrate Property-Based Testing (PBT) into both the backend and frontend to complement existing manual test cases. By automatically generating a wide range of inputs, including edge cases and boundary values, we aim to discover hidden bugs and enhance the overall robustness of complex business logic.

## Goals
- Install and configure PBT libraries for Go (Backend) and TypeScript (Frontend).
- Analyze the existing codebase to identify high-impact areas for PBT.
- Implement at least two PBT cases for each environment.
- Ensure seamless integration with the existing CI/CD pipeline and test runners.

## Functional Requirements

### 1. Library Installation
- **Backend (Go):** Install `pgregory.net/rapid`.
- **Frontend (TypeScript):** Install `fast-check` as a development dependency.

### 2. Implementation Targets (Recommended)

#### Backend:
- **Feed Normalization (`cmd/feed-reader/fetcher.go`):**
    - Verify that various forms of `gofeed.Item` input consistently map to correct `store.CreateItemParams`.
- **Scheduling Logic (`cmd/feed-reader/scheduler.go`):**
    - Ensure that next fetch time calculations, including jitter, always fall within expected bounds.

#### Frontend:
- **Item Filtering & Sorting (`frontend/src/lib/item-query.ts`):**
    - Validate that for any combination of item lists, filters, and sort orders, the output always satisfies invariants (e.g., remains sorted, contains no filtered-out items).
- **URL/String Utilities:**
    - If any, ensure normalization logic is resilient to diverse and malformed input strings.

## Non-Functional Requirements
- **Performance:** Iteration counts should be balanced to provide thorough testing without significantly slowing down the CI pipeline.
- **Maintainability:** Property definitions should be concise and easy to understand for developers unfamiliar with PBT.

## Acceptance Criteria
- [ ] `rapid` is added to Go dependencies.
- [ ] `fast-check` is added to frontend `devDependencies`.
- [ ] At least 2 major logic components in the backend have passing PBT cases.
- [ ] At least 2 major logic components in the frontend have passing PBT cases.
- [ ] PBT tests are executed as part of the standard `go test` and `vitest` commands.

## Out of Scope
- Complete replacement of existing table-driven or unit tests.
- PBT for the raw database persistence layer (focus on logic layers).
