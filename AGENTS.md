# AI Agent Guidelines

This file provides instructions for AI agents working on this project.

## Core Principles

AI agents MUST follow these rules:

1. **Test-Driven Development (TDD)**:
    - **Red**: Write a failing test before implementation.
    - **Green**: Implement the minimum code to pass the test.
    - **Refactor**: Improve code quality while maintaining passing tests.
2. **Language Rules**:
    - **Conversations**: Japanese.
    - **Code, Commits, and Documentation**: English.
3. **Dependency Management**:
    - Use `npm ci` to install Node.js dependencies.
4. **Commit Guidelines**:
    - Follow [Conventional Commits](https://www.conventionalcommits.org/).
    - Format: `<type>(<scope>): <description>` (e.g., `feat(api): add feed refresh endpoint`).

## Fast Test Execution & Debugging

When verifying changes, AI agents should optimize their feedback loop by using the following guidelines:

1. **Run Related Tests Only**:
    - Avoid running the entire test suite (380+ cases) during active development.
    - Run only the tests related to the modified files using paths relative to the Vitest root (`frontend`):
      ```bash
      npm run test:related -- <frontend-relative-modified-file-path> --run
      ```
      (e.g., `npm run test:related -- src/components/ActionButton.tsx --run`)
    - Do not pass repository-root paths such as `frontend/src/components/ActionButton.tsx`; `vitest related` resolves file arguments from the configured Vitest root.
    - You may narrow a run to a specific Vitest project when useful:
      ```bash
      npm run test:related -- src/components/ActionButton.tsx --project browser --run
      npm run test:related -- src/lib/item-utils.ts --project jsdom --run
      ```
2. **Visual Debugging via Screenshots**:
    - Browser tests have `screenshotFailures: true` enabled.
    - If a browser test fails, a screenshot of the failure state is automatically captured.
    - Check the test results directory (printed in the failure logs) and use the `view_file` tool to inspect the generated `.png` screenshot to visually debug UI/DOM state failures.

## Solid 2.0 Coding Conventions

The frontend uses SolidJS 2.0 (`solid-js@2.0.0-rc.*` / `@solidjs/web`). All code and tests must follow these rules:

1. **Imports & JSX Ownership**:
    - Web renderer & JSX types belong to `@solidjs/web`, not `solid-js` or `solid-js/web`.
    - Imports: `import { render, Portal } from "@solidjs/web";` and `import type { JSX } from "@solidjs/web";`.
    - TypeScript JSX import source is configured as `"jsxImportSource": "@solidjs/web"`.
    - Store APIs belong to core: `import { createStore } from "solid-js";`.

2. **Reactivity & Lifecycle**:
    - **`createEffect`**: Always uses the two-argument form `createEffect(compute, apply)`. The compute phase tracks dependencies; the apply phase runs side effects. Single-argument `createEffect(fn)` is removed.
    - **Declaration Order (TDZ)**: Because `createEffect` compute phase executes during component initialization, queries (`useQuery`), memos (`createMemo`), and accessors must be declared **before** any effect that references them to prevent `ReferenceError: Cannot access '...' before initialization`.
    - **Component Lifecycle**: Use `onSettled` (with a returned cleanup function) instead of `onMount` + `onCleanup` for post-mount side effects.
    - **Async Boundaries**: Use `<Loading fallback={...}>` (from `"solid-js"`) instead of `<Suspense>`. Reading async values outside a `<Loading>` boundary defers component mount until settlement.
    - **Context Providers**: `<Context value={...}>` is the provider itself. `<Context.Provider>` is removed. Set default value to `null` (`createContext<T | null>(null)`) when null-checking outside a provider.

3. **JSX Attributes & Event Handlers**:
    - **Event Handlers**: Event attributes spread onto JSX elements or bound on native elements must use camelCase (e.g. `onClick`, `onTouchStart`, `onTouchMove`). Lowercase attributes like `ontouchstart` are treated as HTML string attributes, not event listeners.
    - **Boolean Attributes**: Boolean attributes follow presence/absence (`data-is-read={false}` removes the attribute; `data-is-read={true}` emits `data-is-read=""`). When `"true"` / `"false"` string attributes are required, use `data-is-read={String(val)}`.
    - **ARIA Boolean Attributes**: ARIA enumerated attributes (e.g., `aria-pressed`, `aria-expanded`) must be passed as string booleans `"true" | "false"` per Solid 2.0 `EnumeratedPseudoBoolean` types.

4. **Stores & Mutations**:
    - Setters are draft-first: `setStore(draft => { draft.value = newValue; })`. In-place mutations on the draft proxy are canonical.
    - Because store mutations can update in place, avoid caching arrays by object reference (e.g. `WeakMap<T[], ...>`) across mutations.

5. **Testing & Microtask Batching**:
    - Signal and store writes are staged and committed on microtask flush.
    - In tests, call `flush()` from `"solid-js"` before asserting on signal values or after setting state when assertions are synchronous: `setCount(1); flush(); expect(count()).toBe(1);`.
    - When waiting for asynchronous transitions or TanStack Query refetches in tests, use `vi.waitFor(() => { flush(); expect(...); })`.

6. **TanStack Query v6**:
    - `useQuery` replaces `createQuery`, and `useMutation` replaces `createMutation`.
    - `mutate` returns a Promise directly in v6: use `await mutate(variables)`.
