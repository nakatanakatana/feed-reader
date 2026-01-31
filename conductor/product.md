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
-   **Portability:** Easy to deploy and maintain as a single container or a single executable binary.

### Key Features

- **Full-Stack Application:** Includes both a backend API and a web frontend.

- **Single Binary Distribution:** Both the backend API and the frontend Web UI are bundled into a single executable for simplified deployment and distribution.

- **Feed Management:** Add, organize, and manage RSS/Atom feeds via the UI. Supports sorting by update time and bulk operations like tagging multiple feeds simultaneously.


- **Manual Feed Refresh:** Trigger immediate updates for one or more feeds directly from the UI, bypassing the background scheduler. Includes real-time feedback with loading indicators and error reporting at the individual feed level.


- **OPML Import:** Bulk import existing subscriptions from other RSS readers using the standard OPML format, with automatic deduplication.


- **Article Management:** Retrieve articles with efficient incremental fetching and flexible filtering. Track article status including read/unread using dedicated local collections. Features an information-dense list view displaying key metadata (publication/creation dates, snippets). Supports "Load More" functionality for paging through historical content and automatic appending of new items. Includes date-based filtering and a visibility toggle to easily show or hide read items. Supports bulk operations for improved efficiency.


- **Content Reading:** Clean, distraction-free modal interface for reading full article content. Supports rich HTML rendering, images, and categories. Features robust, keyboard-centric navigation between items with automatic pagination and read-status management. Implements standard modal interactions including Escape key and backdrop dismissal. Full URL synchronization (deep linking) for direct access and browser history support.

- **Markdown Rendering:** Automatically converts article content and descriptions from HTML to Markdown during ingestion. Renders this Markdown back to safe HTML in the frontend, ensuring a consistent and secure reading experience while preserving links, images, and basic formatting.



- **Tagging System:** Create and manage custom tags to categorize feeds. Features a robust bulk tagging UI to efficiently organize multiple subscriptions at once. Filter both the feed list and article stream by selected tags for organized content discovery, with unread counts displayed per tag to prioritize reading.



- **Background Fetching:** Periodically fetches and updates feeds in the background with adaptive scheduling and jitter to ensure content is always fresh without overloading servers.



- **Deduplication & Storage:** Efficiently stores and retrieves articles with URL-based deduplication and normalized data structures, ensuring unique presentation even when items are associated with multiple feeds.



- **Standard Compliance:** Supports standard RSS and Atom feed formats.
-   **Responsive Design:** Accessible on desktop and mobile devices with a tailored experience. Features adaptive headers that prioritize content on small screens and Floating Action Buttons (FAB) for ergonomic access to primary actions like tag management.
-   **Instant Content:** Automatically triggers an initial fetch when a new feed is added, ensuring immediate content availability.

### Success Metrics
-   **User Engagement:** Regular usage of the application for daily reading.
-   **Deployment Ease:** Simple setup process for self-hosting (e.g., Docker Compose).
-   **Responsiveness:** Fast UI interactions and quick article loading.
