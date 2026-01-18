# Track Specification: Move API endpoints under /api

## Overview
Move backend API endpoints under the `/api` prefix to facilitate future bundled distribution of frontend and backend. This organization allows the root and other paths to be dedicated to serving static files.

## Functional Requirements
- **Backend (Go):**
    - Update `http.NewServeMux` registration to use the `/api/` prefix.
    - Employ `http.StripPrefix("/api", handler)` to maintain existing service path definitions while routing.
- **Frontend (SolidJS):**
    - Update the `baseUrl` in the `@connectrpc/connect-web` transport configuration to `/api`.
- **Development Environment:**
    - Update the proxy configuration in `vite.config.js` to use the `/api` prefix instead of service names.

## Non-Functional Requirements
- **Compatibility:** Ensure existing API communication remains functional in development (Vite proxy) and testing (MSW) environments.

## Acceptance Criteria
- [ ] All backend unit tests pass.
- [ ] All frontend unit tests pass.
- [ ] Feed list, creation, and deletion function correctly in the browser using the development server.
- [ ] Verify in the browser's Network tab that API requests are directed to URLs starting with `/api/feed.v1.FeedService/`.

## Out of Scope
- Implementing static file serving from the Go backend (this track focuses solely on endpoint organization).
- Adding authentication or authorization.
