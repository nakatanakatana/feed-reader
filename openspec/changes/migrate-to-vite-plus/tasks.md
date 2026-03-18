## 1. Setup & Migration

- [x] 1.1 Run `npx vite-plus migrate --no-interactive` to initialize the migration from Vite to Vite plus.
- [x] 1.2 Update `package.json` dependencies and run `npm install` to synchronize the lockfile.

## 2. Configuration Refinement

- [x] 2.1 Consolidate all settings from `vite.config.js` into a new `vite.config.ts` file.
- [x] 2.2 Ensure Vitest projects (Node and Browser) are correctly defined in `vite.config.ts`.
- [x] 2.3 Configure `lint` and `fmt` blocks in `vite.config.ts` to match existing Biome rules (2 spaces, double quotes, recommended SolidJS rules).
- [x] 2.4 Add `staged` block to `vite.config.ts` for unified pre-commit validation.

## 3. Code & Script Updates

- [x] 3.1 Replace `import { ... } from 'vitest'` with `import { ... } from 'vite-plus/test'` across all frontend test files.
- [x] 3.2 Update `package.json` scripts to use the `vp` CLI (`vp dev`, `vp build`, `vp test`, `vp check`).
- [x] 3.3 Remove `biome.json` and uninstall `@biomejs/biome`, `vite`, `vitest`, and other redundant devDependencies.

## 4. Verification

- [x] 4.1 Run `vp check` to verify that linting, formatting, and type-checking are all passing.
- [x] 4.2 Run `vp test` to ensure both Node and Browser tests are executing correctly.
- [x] 4.3 Run `vp build` to confirm the production build completes without errors.
- [x] 4.4 Manually verify that `vp dev` starts the development server and HMR is functional.
