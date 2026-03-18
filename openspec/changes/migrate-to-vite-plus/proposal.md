## Why

Currently, the frontend uses multiple disparate tools (Vite, Vitest, Biome) with separate configurations. This increases maintenance overhead and complexity when configuring shared features like OpenTelemetry or unified validation loops.

Migrating to Vite plus will unify these tools into a single, highly-integrated toolchain, simplifying configuration, improving performance, and providing a cohesive developer experience.

## What Changes

- **Tooling Consolidation**: Replace standalone `vite`, `vitest`, and `biome` with `vite-plus`.
- **CLI Migration**: Update `package.json` scripts to use the `vp` CLI (`vp dev`, `vp build`, `vp test`, `vp check`).
- **Configuration Integration**: Merge configurations for development, testing, linting, and formatting into `vite.config.ts`.
- **Lint/Format Migration**: Switch from Biome to Vite plus built-in linting and formatting (powered by Oxlint/Oxfmt).
- **Import Updates**: Update Vitest imports from `vitest` to `vite-plus/test`.
- **Removal of Redundancy**: Delete `biome.json` and remove related standalone dependencies from `package.json`.
- **CI/CD Alignment**: Update CI workflows to use `vp check` for unified validation (lint, format, type-check).

## Capabilities

### New Capabilities

- `frontend-unified-tooling`: Unified frontend development toolchain for building, testing, linting, and formatting.

### Modified Capabilities

- (None)

## Impact

- **Developer Workflow**: Developers will use `vp` commands instead of `npm run lint/format`.
- **Build System**: `vite.config.ts` becomes the single source of truth for the entire frontend toolchain.
- **Dependencies**: Significant reduction in `devDependencies` in `package.json`.
- **CI Pipeline**: Simplified validation steps using `vp check`.
