# Overview
Currently, `msw` (Mock Service Worker) and its related dependencies are bundled in the production build, unnecessarily increasing the bundle size. This track aims to configure the application to bundle these libraries only when needed (e.g., in development mode). Additionally, `vite-bundle-analyzer` will be introduced to verify the bundle content and ensure the exclusion.

# Functional Requirements
- **Conditional Loading of MSW:** Modify the initialization logic to dynamically import `msw` only in development mode using `import.meta.env.MODE` (or `DEV`). This will enable tree-shaking for production builds.
- **Bundle Analyzer Integration:** Add `vite-bundle-analyzer` as a `devDependency` and include a script (e.g., `npm run analyze`) in `package.json` to visualize the bundle size.
- **Verification:** Compare bundle sizes before and after the changes to confirm that `msw` and its dependencies are excluded from the production build.

# Non-Functional Requirements
- **Performance:** Reduce the initial load size of the production build to improve application loading speed.
- **Maintainability:** Keep `vite-bundle-analyzer` as a permanent tool to facilitate future bundle size monitoring.

# Acceptance Criteria
- [ ] Verify using `vite-bundle-analyzer` that `msw` and its dependencies are absent from the production build content.
- [ ] Ensure no regressions in application behavior: `msw` should continue to function in the development environment, and the application should operate correctly without it in production.
- [ ] The `npm run analyze` command executes successfully and generates a report.

# Out of Scope
- Reduction of libraries other than `msw` (focus is strictly on `msw` for this track).
- Exclusion of test code (e.g., `vitest`), as these are typically handled automatically by build configurations, but are explicitly out of scope for this specific task.