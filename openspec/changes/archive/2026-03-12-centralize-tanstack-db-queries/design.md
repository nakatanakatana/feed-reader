## Context

The frontend already defines core TanStack DB collections in shared library modules, but many screen-specific queries are still created inline in components. This pattern mixes UI concerns with joins, ordering, filtering, and aggregate logic, and it has already led to similar list definitions being maintained separately for article lists, article detail navigation, feed lists, and tag pickers.

The current codebase also shows a positive pattern worth extending: reusable derived collections such as `itemsUnreadQuery` and `tagsFeedQuery` already live in shared library modules and are consumed across the app. The design should expand that pattern without changing backend APIs or user-visible behavior.

## Goals / Non-Goals

**Goals:**
- Establish a shared frontend query layer for TanStack DB derived collections and reusable query builders.
- Make article list screens and article detail navigation derive data from the same list-definition logic.
- Reduce repeated tag, feed, and aggregate queries across components.
- Improve testability by making query behavior verifiable outside UI components.

**Non-Goals:**
- Changing backend RPC APIs, transport configuration, or TanStack Query usage for detail fetches.
- Reworking unrelated local UI state such as selection state, modal state, or transient interaction state.
- Introducing new frontend data-management libraries or changing the product's user-visible behavior.

## Decisions

### Decision: Separate base collections from reusable query definitions

The frontend will keep raw TanStack DB collections in collection-oriented library modules and introduce a dedicated query layer for reusable derived collections and query builders.

- Rationale: collections represent synchronized data sources, while the repeated logic in components is mostly derived data composition. Separating them clarifies responsibilities and makes reuse explicit.
- Alternative considered: continue adding `createLiveQueryCollection` exports ad hoc in existing component-adjacent files. Rejected because it does not solve discoverability or prevent query duplication from spreading.

### Decision: Share article list-definition logic between list and detail flows

Article list rendering and article detail navigation will use the same underlying query definition for ordering, tag filtering, and read-state merging.

- Rationale: `ItemList` and `ItemDetailRouteView` currently define very similar article queries, but they are not identical. Centralizing this logic reduces drift and ensures navigation follows the same list semantics the user sees in the main list.
- Alternative considered: keep separate queries and rely on tests to keep them aligned. Rejected because the duplication itself is the main source of inconsistency risk.

### Decision: Move aggregate and picker queries into shared domain modules

Unread totals, tag badge counts, feed filtering, feed sorting, and tag picker queries will be defined in shared modules and consumed by components with minimal inline query logic.

- Rationale: these queries are domain concerns, not presentation concerns. Centralizing them allows multiple screens to share the same behavior and makes aggregate calculations easier to test directly.
- Alternative considered: create component-specific hooks that wrap inline query definitions. Rejected because the underlying query logic would still remain screen-scoped rather than domain-scoped.

### Decision: Preserve UI-only post-processing only where it is intentionally view-local

Pure presentation state that is local to a screen, such as transient hidden item IDs or selection state, may remain in the component or UI store even when the underlying query becomes shared.

- Rationale: not every transformation belongs in TanStack DB. View-local interaction state should stay close to the UI, while reusable domain derivation should move into the query layer.
- Alternative considered: force all filtering and selection-related behavior into query definitions. Rejected because it would overfit DB abstractions to ephemeral UI concerns.

## Risks / Trade-offs

- [Shared query abstractions become too generic] -> Keep modules domain-oriented and optimize for the existing screens first rather than building a universal query DSL.
- [Parameterized derived collections may be awkward with Solid reactivity] -> Prefer a small number of explicit query builders and ensure reactive inputs are read inside `useLiveQuery` or accessor-backed wrappers.
- [Refactor changes behavior accidentally] -> Preserve current ordering/filtering semantics and add query-focused tests before moving component logic.
- [Module boundaries become unclear during migration] -> Define naming and placement conventions up front for collections, derived collections, and query builders.

## Migration Plan

1. Identify repeated query definitions and group them by domain: articles, feeds, and tags.
2. Introduce shared query modules that expose reusable derived collections and parameterized query builders.
3. Refactor article list and detail screens to consume the same article list-definition query.
4. Refactor feed and tag-related screens to consume shared picker, aggregate, and sorting queries.
5. Add or update tests so query behavior is validated independently from component rendering.
6. Verify that user-visible behavior remains unchanged after the migration.

Rollback is straightforward because the change is frontend-only: components can temporarily revert to their previous inline query definitions if a regression appears during implementation.

## Open Questions

- Should the new query layer live under `frontend/src/lib/queries/` or remain colocated in existing `*-db.ts` modules with stricter export conventions?
- Which repeated queries should become stable exported derived collections, and which should remain parameterized builders consumed via `useLiveQuery`?
- How far should query-specific tests go before they become redundant with existing component integration tests?
