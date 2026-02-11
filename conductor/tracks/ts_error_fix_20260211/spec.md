# Track Specification: TypeScript Error Fixes and CI Lint Integration

## Overview
Currently, the project lacks a unified TypeScript type-checking command in the linting workflow. Additionally, there are existing TypeScript errors across the repository that prevent a clean build/check. This track aims to integrate `tsc --noEmit` into the `npm run lint` command and resolve all existing TypeScript errors in the project.

## Functional Requirements
- **Unified Lint Command**: Update `package.json` to include or update a `lint` script that runs both `tsc --noEmit` and `biome check`.
- **TypeScript Error Resolution**: Fix all current TypeScript errors across the entire repository, including `frontend/` and root-level config files (e.g., `panda.config.ts`).
- **Build Integrity**: Ensure that `npm run lint` passes successfully after the fixes.

## Non-Functional Requirements
- **Type Safety**: Maintain or improve type safety without using `any` or `@ts-ignore` unless absolutely necessary and justified.
- **Consistency**: Follow existing TypeScript patterns and coding standards defined in the project.

## Acceptance Criteria
- [ ] `npm run lint` is defined in `package.json`.
- [ ] Running `npm run lint` executes `tsc --noEmit` and `biome check`.
- [ ] `npm run lint` completes with an exit code of 0 (no errors).
- [ ] All TypeScript files in the repository are free of type errors.

## Out of Scope
- Major refactoring of logic not related to fixing type errors.
- Adding new features or changing UI behavior.
- Setting up CI/CD pipelines (only local command configuration is included).
