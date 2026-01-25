# Initial Concept
A self-hosted, full-stack RSS/Atom feed reader application, featuring a robust backend for feed management and a modern frontend for a complete user experience.

## Product Guide

### Target Audience
The primary target audience is individuals and organizations seeking control over their news consumption through a self-hosted solution.
-   **Self-Hosters:** Users who prefer to run their own services for privacy and data ownership.
-   **Power Users:** Individuals who need a fast, customizable interface for reading large volumes of content.
-   **Small Teams:** Groups wanting a shared, private feed aggregation tool.

### Core Value Proposition
-   **Privacy & Control:** Complete ownership of data and subscription lists with no third-party tracking.
-   **Unified Experience:** A seamless integration between the high-performance backend and a responsive, user-friendly frontend.
-   **Portability:** Easy to deploy and maintain as a single container or lightweight service set.

### Key Features

- **Full-Stack Application:** Includes both a backend API and a web frontend.

- **Feed Management:** Add, organize, and manage RSS/Atom feeds via the UI.

- **OPML Import:** Bulk import existing subscriptions from other RSS readers using the standard OPML format, with automatic deduplication.

- **Article Management:** Retrieve articles with flexible filtering and sorting. Track article status including read/unread and saved/unsaved (bookmarks).



- **Content Reading:** Clean, distraction-free modal interface for reading full article content. Supports rich HTML rendering, author information, and quick navigation between items.



- **Background Fetching:** Periodically fetches and updates feeds in the background with adaptive scheduling and jitter to ensure content is always fresh without overloading servers.



- **Deduplication & Storage:** Efficiently stores articles with URL-based deduplication and normalized data structures.



- **Standard Compliance:** Supports standard RSS and Atom feed formats.
-   **Responsive Design:** Accessible on desktop and mobile devices.
-   **Instant Content:** Automatically triggers an initial fetch when a new feed is added, ensuring immediate content availability.

### Success Metrics
-   **User Engagement:** Regular usage of the application for daily reading.
-   **Deployment Ease:** Simple setup process for self-hosting (e.g., Docker Compose).
-   **Responsiveness:** Fast UI interactions and quick article loading.
