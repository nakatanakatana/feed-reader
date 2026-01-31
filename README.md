# feed-reader

![Coverage](https://raw.githubusercontent.com/nakatanakatana/octocov-central/main/badges/nakatanakatana/feed-reader/coverage.svg)
![Code to Test Ratio](https://raw.githubusercontent.com/nakatanakatana/octocov-central/main/badges/nakatanakatana/feed-reader/ratio.svg)
![Test Execution Time](https://raw.githubusercontent.com/nakatanakatana/octocov-central/main/badges/nakatanakatana/feed-reader/time.svg)
[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/nakatanakatana/feed-reader)

A self-hosted, full-stack RSS/Atom feed reader application.

## Key Features

- **Single Binary Distribution**: Serve both the API and Web UI from a single executable.
- **Feed Management**: Add, organize, and manage feeds with bulk operations and OPML import.
- **Background Fetching**: Adaptive scheduling to keep content fresh.
- **Rich Reading Experience**: Clean, distraction-free interface with full HTML support and keyboard navigation.
- **Responsive Design**: Tailored experience for both desktop and mobile devices.

## Tech Stack

- **Backend**: Go with Connect RPC, SQLite (sqlc), and `embed` for asset bundling.
- **Frontend**: React, TypeScript, TanStack Router, TanStack Query, and Panda CSS.

## Getting Started

### Local Development

1.  **Install dependencies**:
    ```bash
    make setup
    ```
2.  **Generate code**:
    ```bash
    make gen
    ```
3.  **Start development servers**:
    ```bash
    make dev
    ```
    -   Backend API: http://localhost:8080
    -   Frontend UI: http://localhost:5173

### Build Single Binary

To build a fully self-contained binary:

```bash
make build
```

The output will be in `dist/feed-reader`. When executed, it serves the Web UI at http://localhost:8080 and the API at `/api/*`.

## Testing

Run the full test suite (backend and frontend):

```bash
make test
```
