# Technology Stack

This document defines the technology stack used in the Feed Reader project.

## 1. Backend
The backend is responsible for feed management, article fetching, and providing a robust API.

-   **Programming Language:** Go (Golang)
-   **API Framework:** Connect RPC (Protobuf over HTTP/2)
-   **Database:** SQLite (Relational storage via `ncruces/go-sqlite3`)
-   **SQLite Resilience:** Application-level retry mechanism with exponential backoff for transient lock conflicts (`SQLITE_BUSY`).
- **Write Consolidation:** Dedicated Write Queue Service to batch multiple write operations into single transactions. For large-scale operations like OPML import, the application utilizes manual bulk transaction scoping and parallel processing to significantly reduce I/O overhead and improve throughput.
-   **Query Tooling:** `sqlc` (Type-safe SQL generation)
-   **Feed Parsing:** `gofeed` (Robust RSS/Atom parsing)
-   **HTML-to-Markdown:** `github.com/JohannesKaufmann/html-to-markdown` (For normalizing content storage)
-   **HTTP Client:** `hashicorp/go-retryablehttp` (Resilient network requests)
-   **Protocol Management:** `buf` (Protobuf management and generation)
-   **CLI Manager:** `aqua` (Declarative tool management)
-   **Asset Bundling:** Go `embed` (For packaging frontend artifacts into the binary)
-   **Property-Based Testing:** `rapid` (For automated edge-case discovery)
-   **Testing Framework:** `gotest.tools/v3` (Standard assertion and golden testing library for clear, readable, and consistent backend tests). The project emphasizes the use of **hand-written mocks** over heavy mocking frameworks like `testify/mock` to maintain simplicity and clarity.
-   **Task Runner:** `GNU Make` (Unified command interface)

## 2. Frontend
The frontend is a modern Single Page Application (SPA) designed for speed and responsiveness.

-   **Framework:** SolidJS (Fine-grained reactivity)
-   **Routing:** TanStack Router (Type-safe routing)
-   **State & Data Management:** TanStack Query (Efficient server-state management), TanStack DB (Local data synchronization with centralized sorting via reactive hooks), **SolidJS Store** (Centralized reactive application state)
-   **Language:** TypeScript (Type safety)
-   **Markdown Rendering:** `markdown-it` (Safe client-side rendering)
-   **Styling:** Panda CSS (CSS-in-JS with build-time generation)
-   **Communication:** Connect RPC Web (Communication with the backend)
-   **Testing:** Vitest (Test runner with Browser Mode enabled), Playwright (Browser provider), solid-js/web (for rendering in tests). **Strategy:** Integration tests prioritize actual library logic (e.g., TanStack DB) over internal mocks to ensure high reliability.
-   **Snapshot Testing:** Vitest `toMatchSnapshot()` (To ensure UI stability and verify complex data transformations)
-   **API Mocking:** MSW (Mock Service Worker). Serves as the primary mocking layer for both standalone development and integration testing, intercepting network requests at the browser level.
-   **Property-Based Testing:** `fast-check` (For robust logic validation)
-   **Linting & Formatting:** BiomeJS (Fast all-in-one toolchain)

## 3. Infrastructure & Deployment
-   **Architecture:** Self-contained full-stack application with single binary distribution.
-   **Containerization:** Docker (Multi-stage builds using `golang:1.25-alpine`, `node:20-alpine`, and `gcr.io/distroless/static-debian12`).
-   **Version Control:** Git.