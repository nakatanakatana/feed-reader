## Why

The frontend already uses TanStack DB collections successfully, but many query definitions still live inside UI components. This makes list composition, filtering, joins, and aggregate logic hard to reuse across screens, and increases the risk that related views drift apart over time.

## What Changes

- Introduce a shared frontend query layer for TanStack DB derived collections and selectors, organized by domain rather than by component.
- Move repeated list, filter, join, and aggregate query logic out of UI components and into reusable query modules.
- Standardize how article, feed, and tag views consume shared query definitions so related screens derive data from the same source of truth.
- Preserve current user-visible behavior while improving consistency, maintainability, and testability of data access patterns.

## Capabilities

### New Capabilities
- `frontend-query-architecture`: Defines how the frontend centralizes reusable TanStack DB query definitions and shared derived collections outside components.

### Modified Capabilities
- `article-management`: Article list and detail flows will share the same underlying list-definition requirements so filtering and navigation stay consistent across views.
- `feed-management`: Feed and tag management screens will rely on shared feed and tag query definitions instead of duplicating query logic in components.

## Impact

- Affected code: `frontend/src/lib/*.ts`, `frontend/src/components/*.tsx`, and related tests.
- Affected systems: frontend TanStack DB collections, live queries, component data-access patterns, and query-focused test coverage.
- APIs and dependencies remain unchanged; the change is focused on frontend query architecture and consistency.
