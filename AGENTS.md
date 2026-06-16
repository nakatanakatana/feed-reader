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
    - Run only the tests related to the modified files using:
      ```bash
      npm run test:related -- <modified-file-path>
      ```
      (e.g., `npm run test:related -- frontend/src/components/ActionButton.tsx`)
2. **Visual Debugging via Screenshots**:
    - Browser tests have `screenshotFailures: true` enabled.
    - If a browser test fails, a screenshot of the failure state is automatically captured.
    - Check the test results directory (printed in the failure logs) and use the `view_file` tool to inspect the generated `.png` screenshot to visually debug UI/DOM state failures.
