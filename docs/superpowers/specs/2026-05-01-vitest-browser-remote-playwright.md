# Spec: Remote Playwright Server for Vitest Browser Mode

## Goal
Connect Vitest browser tests running in WSL to a Playwright server running in a separate, lightweight Docker container. This avoids the need to install browsers directly in the WSL environment.

## Architecture

### 1. Playwright Server Container
- **Base Image**: `node:24-bookworm-slim` (Lightweight Debian-based Node.js).
- **Contents**: Chromium browser and its minimal OS dependencies.
- **Process**: Runs `npx playwright run-server --port 3000 --browser chromium`.
- **Networking**: Maps port 3000 to the host.

### 2. Vitest Configuration (WSL Side)
- **Detection**: Uses `PLAYWRIGHT_WS_ENDPOINT` environment variable to toggle remote mode.
- **Connection**: Pass `connectOptions` with `wsEndpoint` to the `@vitest/browser-playwright` provider.
- **Reverse Connectivity**: Configure Vitest's browser API server to listen on `0.0.0.0` and use `host.docker.internal` as the address so the containerized browser can reach the test runner.

## Component Details

### Docker Configuration
- `Dockerfile.playwright`:
  - `FROM node:24-bookworm-slim`
  - `RUN npx playwright install --with-deps chromium`
  - `ENTRYPOINT ["npx", "playwright", "run-server", "--port", "3000", "--browser", "chromium"]`
- `docker-compose.yml`:
  - Service `playwright-server`
  - Build using `Dockerfile.playwright`
  - Ports: `3000:3000`
  - IPC: `host` (to prevent Chromium crashes)

### Vitest Configuration (`vite.config.js`)
- `test.browser.provider`: 
  - If `process.env.PLAYWRIGHT_WS_ENDPOINT` exists, use `playwright({ connectOptions: { wsEndpoint: process.env.PLAYWRIGHT_WS_ENDPOINT } })`.
- `test.browser.api`:
  - `host: '0.0.0.0'` (Listen on all interfaces).
  - `port: 63315` (Fixed port for consistency).
- **Environment Variable handling**:
  - Add logic to use `http://host.docker.internal` as the Vitest API address when running in remote mode.

## Testing & Verification
1. Start the server: `docker compose up -d`
2. Run tests: `PLAYWRIGHT_WS_ENDPOINT=ws://localhost:3000 npm test`
3. Verify: Tests pass without needing local browser binaries.

## Alternatives Considered
1. **Official Playwright Image**: Rejected due to size (~2GB+).
2. **Local Browser**: Keep as default when no environment variable is provided.
