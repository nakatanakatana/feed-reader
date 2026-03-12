## Context

The Feed Reader application is a self-hosted, full-stack RSS/Atom feed reader designed for privacy and portability. It currently consists of a Go-based backend and a SolidJS-based frontend, packaged into a single binary for ease of deployment. This design document establishes the baseline architecture for the project within the OpenSpec framework.

## Goals / Non-Goals

**Goals:**
- Formally document the existing system architecture and technical decisions.
- Provide a clear baseline for future modifications and new capability proposals.
- Align the documentation with the actual implementation as of March 2026.

**Non-Goals:**
- Introducing any changes to the current application logic or architecture.
- Performing any code refactoring during this documentation phase.

## Decisions

### 1. Language and API Framework
- **Backend (Go):** Selected for its performance, concurrency model, and suitability for creating self-contained binaries.
- **API (Connect RPC):** Used Protobuf over HTTP/2 to provide type-safe, efficient communication between frontend and backend. It simplifies the generation of both Go and TypeScript clients.

### 2. Frontend Framework and State Management
- **Framework (SolidJS):** Chosen for its fine-grained reactivity, providing a highly responsive UI with minimal overhead.
- **Routing (TanStack Router):** Ensures type-safe routing throughout the application.
- **Data Fetching (TanStack Query):** Manages server-state, caching, and background synchronization efficiently.
- **Local Sync (TanStack DB):** Used for local data synchronization and reactive hooks for centralized sorting.

### 3. Database Strategy
- **SQLite:** Used for persistent storage to maintain the single-binary, self-hosted nature of the application. It avoids the need for a separate database server.
- **Write Consolidation:** Implemented a dedicated Write Queue Service to batch write operations, mitigating SQLite's concurrent write limitations.
- **Resilience:** Application-level retries with exponential backoff are used to handle transient `SQLITE_BUSY` errors.

### 4. Content Normalization
- **HTML-to-Markdown:** All incoming feed content is converted to Markdown during ingestion. This ensures consistent storage and allows for safe rendering in the frontend using `markdown-it`.

### 5. Observability
- **OpenTelemetry (OTEL):** Integrated for end-to-end distributed tracing. This allows monitoring performance from frontend user actions down to individual database queries in the backend.

## Risks / Trade-offs

- **[Risk] SQLite Write Performance** → [Mitigation] A centralized Write Queue Service and bulk transaction scoping for heavy operations (like OPML import) ensure the system remains responsive under load.
- **[Risk] Resource Usage during Crawling** → [Mitigation] An adaptive background scheduler adjusts fetch intervals based on feed activity to optimize resource consumption.
- **[Risk] Frontend Bundle Size** → [Mitigation] Use of `vite-bundle-analyzer` and BiomeJS to maintain a lean, high-performance frontend.
