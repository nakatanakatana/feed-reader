## ADDED Requirements

### Requirement: Unified Frontend CLI

The system SHALL provide a single CLI (`vp`) to handle all frontend development, build, testing, and validation tasks.

#### Scenario: Start development server

- **WHEN** the user runs `vp dev`
- **THEN** the system SHALL start the development server with Hot Module Replacement (HMR) enabled.

#### Scenario: Build production assets

- **WHEN** the user runs `vp build`
- **THEN** the system SHALL generate optimized production assets in the `dist/` directory.

### Requirement: Unified Validation Loop

The system SHALL support a unified validation command (`vp check`) that performs linting, formatting, and type-checking in a single pass.

#### Scenario: Verify code quality

- **WHEN** the user runs `vp check`
- **THEN** the system SHALL execute Oxlint, Oxfmt, and TypeScript type-checking and report any violations.

### Requirement: Consolidated Tooling Configuration

The system SHALL use `vite.config.ts` as the primary configuration file for all frontend tooling, including development, build, test, lint, and format settings.

#### Scenario: Configure linting rules

- **WHEN** a developer adds linting rules to the `lint` block in `vite.config.ts`
- **THEN** `vp check` SHALL respect these rules during validation.

### Requirement: Integrated Testing Environment

The system SHALL provide an integrated testing environment powered by Vitest, accessible via the unified CLI.

#### Scenario: Run unit and integration tests

- **WHEN** the user runs `vp test`
- **THEN** the system SHALL execute all frontend tests and report results.

### Requirement: Seamless Tooling Migration

The system SHALL provide an automated migration path from standalone Vite, Vitest, and Biome to the unified Vite plus toolchain.

#### Scenario: Migrate legacy configuration

- **WHEN** the user runs `vp migrate` in a project using standalone tools
- **THEN** the system SHALL update dependencies, rewrite imports, and consolidate configurations into `vite.config.ts`.
