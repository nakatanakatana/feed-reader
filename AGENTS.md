# AI Agent Guidelines

This file provides instructions for AI agents (like Gemini CLI) working on this project.
The `conductor/` directory is the **Source of Truth** for all project definitions and rules.

## Reference Documents

Before starting any task, read these documents:

- **Product Definition**: [conductor/product.md](conductor/product.md)
  - Project goals, features, and target audience.
- **Tech Stack**: [conductor/tech-stack.md](conductor/tech-stack.md)
  - Languages, frameworks, and libraries used.
- **Development Workflow**: [conductor/workflow.md](conductor/workflow.md)
  - TDD requirements, commit message formats, and "Definition of Done".
- **Code Style Guides**: [conductor/code_styleguides/](conductor/code_styleguides/)
  - Coding conventions for Go, TypeScript, and HTML/CSS.

## Core Principles

AI agents MUST follow these rules:

1. **Test-Driven Development (TDD)**:
   - **Red**: Write a failing test before implementation.
   - **Green**: Implement the minimum code to pass the test.
   - **Refactor**: Improve code quality while maintaining passing tests.
2. **Plan-Driven Execution**:
   - All work must be based on the plan defined in `conductor/plan.md`.
   - Do not make changes outside the approved plan without confirmation.
3. **Language Rules**:
   - **Conversations**: Japanese.
   - **Code, Commits, and Documentation**: English.
4. **Dependency Management**:
   - Use `npm ci` to install Node.js dependencies.
5. **Commit Guidelines**:
   - Follow [Conventional Commits](https://www.conventionalcommits.org/).
   - Format: `<type>(<scope>): <description>` (e.g., `feat(api): add feed refresh endpoint`).

## Commands

Refer to the "Development Commands" section in [conductor/workflow.md](conductor/workflow.md) for standard project commands.
