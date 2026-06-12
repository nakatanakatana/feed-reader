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
