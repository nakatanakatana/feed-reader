# Specification: Docker Support

## Overview
The goal of this track is to containerize the application using a multi-stage Docker build. This includes building the frontend, building the backend (with embedded frontend assets), and generating a lightweight final execution image within a single Dockerfile.

## Functional Requirements
- **Multi-stage Build Configuration:**
    - **Stage 1 (Frontend Builder):** Use a `node` image, install dependencies with `npm ci`, and build the frontend assets.
    - **Stage 2 (Backend Builder):** Use a `golang` image. Copy the frontend build artifacts from Stage 1 and build the Go single binary using Go's `embed` functionality.
    - **Stage 3 (Final Image):** Use `gcr.io/distroless/static` (or `base`) to create a minimal image containing only the compiled binary and necessary CA certificates.
- **Data Persistence:**
    - Designate `/data` within the container as the directory for the SQLite database to facilitate volume mounting for persistence.
- **Execution Configuration:**
    - Adhere to the application's default settings for ports and paths.

## Non-Functional Requirements
- **Image Size:** Use `distroless` for the final image to minimize the footprint.
- **Security:** Include only the minimal set of libraries and certificates required for execution.
- **Reproducibility:** Use `package-lock.json` and `go.sum` to ensure consistent and reproducible builds.

## Acceptance Criteria
- [ ] The Docker image builds successfully.
- [ ] The application starts correctly when running the built image, with both backend and frontend integrated.
- [ ] The `/data` directory is usable as the database storage location.
- [ ] The final image does not contain unnecessary build tools (Node.js, Go compiler, etc.).

## Out of Scope
- Creation of a Docker Compose configuration (this track focuses on the Dockerfile itself).
- Setup of cloud deployment pipelines.
