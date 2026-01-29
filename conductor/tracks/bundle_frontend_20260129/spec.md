# Track Specification: Frontend-Backend Bundling (Single Binary Distribution)

## Overview
Bundle the frontend build artifacts into the Go backend binary using Go's `embed` package to enable distribution as a single executable file. This allows users to run both the API and Web UI by executing a single binary.

## Functional Requirements
- **Asset Embedding**: Embed static files from the `frontend/dist` directory into the Go binary using the `embed` package.
- **Static File Serving**: Serve the embedded frontend assets at the root path (`/`).
- **SPA Fallback**: If a request is made for a non-existent static file, return `index.html` to allow the frontend router to handle the request (Single Page Application fallback).
- **API Coexistence**: Existing `/api/*` routes must continue to be handled by the API handlers.
- **Unified Build Process**: Update the build process so that running `make build` automatically builds the frontend and bundles it into the Go binary.

## Non-Functional Requirements
- **Maintain Developer Efficiency**: Ensure the development workflow (`npm run dev`) remains unchanged, continuing to support Hot Module Replacement (HMR) via the Vite dev server.
- **Portability**: The generated binary must be fully self-contained, with no external dependencies on static files.

## Acceptance Criteria
- After running `make build`, the binary in the `dist/` directory serves the frontend UI when accessing `http://localhost:8080`.
- Direct access to frontend subpaths (e.g., `/feeds`, `/tags`) correctly serves the frontend via SPA fallback.
- API requests to `/api/v1/*` continue to function as expected.
- Development using `npm run dev` and `go run ./cmd/feed-reader` remains functional without regression.

## Out of Scope
- Embedding non-frontend static assets (e.g., documentation files).
- Extreme optimization of binary size (e.g., advanced compression).
