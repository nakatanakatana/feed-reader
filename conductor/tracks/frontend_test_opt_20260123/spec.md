# Specification: Frontend Test Performance Optimization

## Overview
Investigate the frontend test suite to identify performance bottlenecks and optimize the slowest tests. The goal is to significantly reduce the execution time of the longest-running tests to improve developer feedback loops and CI duration.

## Problem Statement
The current frontend test suite has execution time issues, but the specific bottlenecks are unidentified. Slow tests hinder productivity and slow down the CI pipeline.

## Objectives
1.  **Identify Bottlenecks:** Profile the test suite to find the slowest test files and individual test cases.
2.  **Root Cause Analysis:** Determine why identified tests are slow (e.g., inefficient rendering, excessive mocking, unoptimized queries, waiting for timeouts).
3.  **Optimization:** Refactor or reconfigure the slowest tests to achieve significant speed improvements (targeting ~50% reduction for the worst offenders).

## Scope
### In Scope
-   Profiling all frontend tests (Vitest).
-   Analyzing `frontend/src/**/*.test.tsx` and `frontend/src/**/*.test.ts`.
-   Modifying test code, test configurations, or mock implementations to improve performance.
-   Documenting findings and improvements.

### Out of Scope
-   Backend test optimization.
-   Reducing code coverage (tests must still cover the same logic).
-   Rewriting the entire test suite.

## Acceptance Criteria
1.  **Profiling Report:** A list of the slowest test files/cases is generated.
2.  **Optimization:** The execution time of the identified bottleneck tests is reduced significantly (target: ~50% faster).
3.  **Stability:** The optimized tests remain reliable (no increased flakiness) and correct.
4.  **Verification:** All frontend tests pass successfully after changes.

## Non-Functional Requirements
-   **Maintainability:** Optimizations should not make the tests overly complex or hard to read.
-   **Correctness:** Optimizations must not change the behavior being tested.
