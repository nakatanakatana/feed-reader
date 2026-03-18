## 1. Query Layer Foundation

- [x] 1.1 Define the frontend query-layer module structure and naming conventions for shared TanStack DB query exports
- [x] 1.2 Extract reusable article query primitives for read-state merging, ordering, and tag-based filtering from existing component logic
- [x] 1.3 Extract reusable feed and tag query primitives for shared picker, aggregate, filter, and sort behavior

## 2. Screen Migration

- [x] 2.1 Refactor article list screens to consume shared article query definitions instead of inline query composition
- [x] 2.2 Refactor article detail navigation to consume the same shared article list-definition query used by the article list
- [x] 2.3 Refactor feed and tag management screens to consume shared feed and tag query definitions

## 3. Verification

- [x] 3.1 Add or update focused tests for shared TanStack DB query behavior outside component rendering
- [x] 3.2 Update component tests as needed to validate that screens still preserve existing user-visible behavior after the query-layer migration
- [x] 3.3 Run the relevant frontend test suite and confirm the refactor does not change current behavior
