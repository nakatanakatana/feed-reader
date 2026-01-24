# Technology Stack

This document defines the technology stack used in the Feed Reader project.

## 1. Backend
The backend is responsible for feed management, article fetching, and providing a robust API.

-   **Programming Language:** Go (Golang)
-   **API Framework:** Connect RPC (Protobuf over HTTP/2)
-   **Database:** SQLite (Relational storage)
-   **Query Tooling:** `sqlc` (Type-safe SQL generation)
-   **Feed Parsing:** `gofeed` (Robust RSS/Atom parsing)
-   **HTTP Client:** `hashicorp/go-retryablehttp` (Resilient network requests)
-   **Protocol Management:** `buf` (Protobuf management and generation)
-   **CLI Manager:** `aqua` (Declarative tool management)
-   **Task Runner:** `GNU Make` (Unified command interface)

## 2. Frontend
The frontend is a modern Single Page Application (SPA) designed for speed and responsiveness.

-   **Framework:** SolidJS (Fine-grained reactivity)
-   **Routing:** TanStack Router (Type-safe routing)
-   **State & Data Management:** TanStack Query (Efficient server-state management), TanStack DB (Local data synchronization)
-   **Language:** TypeScript (Type safety)
-   **Styling:** Panda CSS (CSS-in-JS with build-time generation)
-   **Communication:** Connect RPC Web (Communication with the backend)
-   **Testing:** Vitest (Test runner with Browser Mode enabled), Playwright (Browser provider), solid-js/web (for rendering in tests)
-   **API Mocking:** MSW (Mock Service Worker) for standalone development and testing.
-   **Linting & Formatting:** BiomeJS (Fast all-in-one toolchain)

## 3. Infrastructure & Deployment
-   **Architecture:** Self-contained full-stack application.
-   **Containerization:** Docker (For consistent environments and easy self-hosting).
-   **Version Control:** Git.