# Technology Stack

This document defines the technology stack used in the Feed Reader project.

## 1. Backend
The backend is responsible for feed management, article fetching, and providing a robust API.

-   **Programming Language:** Go (Golang)
-   **API Framework:** Connect RPC (Protobuf over HTTP/2)
-   **Database:** SQLite (Relational storage)
-   **SQLite Resilience:** Application-level retry mechanism with exponential backoff for transient lock conflicts (`SQLITE_BUSY`).
-   **Write Consolidation:** Dedicated Write Queue Service to batch multiple write operations into single transactions, reducing disk I/O and further minimizing `SQLITE_BUSY` errors during concurrent access.
-   **Query Tooling:** `sqlc` (Type-safe SQL generation)
-   **Feed Parsing:** `gofeed` (Robust RSS/Atom parsing)
-   **HTML-to-Markdown:** `github.com/JohannesKaufmann/html-to-markdown` (For normalizing content storage)
-   **HTTP Client:** `hashicorp/go-retryablehttp` (Resilient network requests)
-   **Protocol Management:** `buf` (Protobuf management and generation)
-   **CLI Manager:** `aqua` (Declarative tool management)
-   **Asset Bundling:** Go `embed` (For packaging frontend artifacts into the binary)
-   **Property-Based Testing:** `rapid` (For automated edge-case discovery)
-   **Task Runner:** `GNU Make` (Unified command interface)

## 2. Frontend
The frontend is a modern Single Page Application (SPA) designed for speed and responsiveness.

-   **Framework:** SolidJS (Fine-grained reactivity)
-   **Routing:** TanStack Router (Type-safe routing)
-   **State & Data Management:** TanStack Query (Efficient server-state management), TanStack DB (Local data synchronization)
-   **Local Data Architecture:** Utilizes the "Handling Partial/Incremental Fetches" pattern with TanStack DB. Maintains separate local collections for `unreadItems` and `readItems` to enable efficient filtering and optimistic updates without redundant network requests.
-   **Language:** TypeScript (Type safety)
-   **Markdown Rendering:** `markdown-it` (Safe client-side rendering)
-   **Styling:** Panda CSS (CSS-in-JS with build-time generation)
-   **Communication:** Connect RPC Web (Communication with the backend)
-   **Testing:** Vitest (Test runner with Browser Mode enabled), Playwright (Browser provider), solid-js/web (for rendering in tests)
-   **API Mocking:** MSW (Mock Service Worker) for standalone development and testing.
-   **Property-Based Testing:** `fast-check` (For robust logic validation)
-   **Linting & Formatting:** BiomeJS (Fast all-in-one toolchain)

## 3. Infrastructure & Deployment
-   **Architecture:** Self-contained full-stack application with single binary distribution.
-   **Containerization:** Docker (For consistent environments and easy self-hosting).
-   **Version Control:** Git.