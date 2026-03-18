## Context

The current frontend toolchain consists of:

- **Vite**: Build tool and dev server.
- **Vitest**: Test runner (Node and Browser projects).
- **Biome**: Linting and formatting.
- **Panda CSS**: CSS-in-JS styling.
- **OpenTelemetry**: Custom frontend instrumentation.

Maintaining separate configurations for Vite, Vitest, and Biome leads to fragmentation. Biome, while fast, is another dependency that needs manual synchronization with Vite/Vitest for features like import organization and file inclusion/exclusion.

## Goals / Non-Goals

**Goals:**

- **Unified Configuration**: Use `vite.config.ts` for all frontend tooling (build, test, lint, format).
- **Consolidated CLI**: Use `vp` (Vite plus) as the primary CLI for all tasks.
- **Simplified CI**: Replace multiple validation steps with a single `vp check`.
- **Maintain Feature Parity**: Ensure SolidJS, TanStack, OTel, and Panda CSS integrations continue to work seamlessly.
- **Automatic Migration**: Use `vp migrate` to handle the bulk of the transition.

**Non-Goals:**

- Changing the frontend framework or core libraries (SolidJS, TanStack).
- Redesigning the OpenTelemetry instrumentation logic (only moving configuration if appropriate).

## Decisions

### 1. Primary Toolchain: Vite plus

We will adopt Vite plus (`vite-plus`) as the unified frontend toolchain. This replaces `vite`, `vitest`, and `biome`.

**Rationale**: Vite plus is designed to unify these tools, reducing configuration drift and providing a more cohesive experience. It uses Oxlint and Oxfmt internally, which are extremely fast and integrated into the Vite/Vitest lifecycle.

### 2. Configuration Strategy

Consolidate all configurations into a single `vite.config.ts` file in the project root.

- **Vite/Vitest settings**: Move from `vite.config.js` to `vite.config.ts`.
- **Lint/Format settings**: Configure via `lint` and `fmt` blocks in `vite.config.ts`.
- **Staged Validation**: Use the `staged` block in `vite.config.ts` to replace `lint-staged` behavior (if we were using it) or to provide a fast local pre-commit check.

### 3. Lint/Format: Oxlint & Oxfmt via Vite plus

Replace Biome with the built-in linting and formatting capabilities of Vite plus.

- **Linting**: Enable recommended rules, including SolidJS-specific rules.
- **Formatting**: Configure to match current Biome settings (2 spaces, double quotes, organize imports).

### 4. Testing: Integrated Vitest

Continue using Vitest but via `vite-plus/test`.

- **Imports**: Change `import { ... } from 'vitest'` to `import { ... } from 'vite-plus/test'`.
- **Browser Testing**: Maintain the Playwright-based browser test project, ensuring it's correctly configured in the unified `vite.config.ts`.

## Risks / Trade-offs

- **[Risk]** `vp migrate` may miss custom Vitest browser project logic.
  - **Mitigation**: Manually review the browser project configuration in `vite.config.ts` after migration.
- **[Risk]** Biome rules might not map 1:1 to Oxlint rules.
  - **Mitigation**: Start with `recommended` rules and manually adjust as needed to match the existing codebase's style.
- **[Risk]** Moving from `vite.config.js` to `vite.config.ts` might require updating some `require` calls to `import` or using `createRequire`.
  - **Mitigation**: The current `vite.config.js` already uses `createRequire` and ESM imports, so the transition should be straightforward.
