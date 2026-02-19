# Initial Concept
A self-hosted, full-stack RSS/Atom feed reader application, featuring a robust backend for feed management and a modern frontend for a complete user experience.

## Product Guide

### Target Audience
The primary target audience is individuals and organizations seeking control over their news consumption through a self-hosted solution.
- **Self-Hosters:** Users who prefer to run their own services for privacy and data ownership.
- **Power Users:** Individuals who need a fast, customizable interface for reading large volumes of content.
- **Small Teams:** Groups wanting a shared, private feed aggregation tool.

### Core Value Proposition
- **Privacy & Control:** Complete ownership of data and subscription lists with no third-party tracking.
- **Unified Experience:** A seamless integration between the high-performance backend and a responsive, user-friendly frontend.
- **Portability:** Easy to deploy and maintain as a single container or a single executable binary.

### Key Features

- **Full-Stack Application:** Includes both a backend API and a web frontend.

- **Progressive Web App (PWA):** Fully installable on mobile and desktop devices. Features automatic background updates and a standalone display mode for a native-like app experience.
  - **Badging API Support:** Displays the total unread count directly on the application icon when installed as a PWA, providing immediate visual feedback without opening the app. The badge updates in real-time as articles are marked as read or unread and is cleared when all items are caught up.

- **Single Binary Distribution:** Both the backend API and the frontend Web UI are bundled into a single executable for simplified deployment and distribution.

- **Containerization:** Official Docker support using multi-stage builds and distroless images for secure, lightweight, and consistent deployment.

- **Feed Management:** Add, organize, and manage RSS/Atom feeds via the UI. Supports sorting by title, last fetched time, and bulk operations like tagging multiple feeds simultaneously.
  - **Bulk Selection:** Features a "Select All" capability in the feed list that respects active filters and sorting, allowing for rapid management of visible feeds.
  - **Floating Bulk Actions:** Consistent with the article management experience, selecting multiple feeds triggers a floating action bar at the bottom of the screen for unified bulk operations.

- **Manual Feed Refresh:** Trigger immediate updates for one or more feeds directly from the UI, bypassing the background scheduler. Includes real-time feedback with loading indicators and error reporting at the individual feed level.

- **Fetch Scheduling & Suspend:** Take control of feed updates with an intelligent, database-backed scheduling system.
  - **Adaptive Intervals:** Automatically adjusts fetch frequency based on item update history, prioritizing active feeds while reducing load from static ones.
  - **Manual Suspend:** Temporarily halt updates for specific feeds for a set duration (1 Day, 3 Days, 1 Week, or 1 Month) directly from the context menu or bulk action bar.
  - **Visual Scheduling:** View the scheduled "Next fetch" time for each feed in the list view, providing transparency into the background fetch cycle.

- **OPML Import:** High-performance bulk import of existing subscriptions using the standard OPML format. Features automatic deduplication and parallel metadata fetching. Optimized database operations ensure that even large imports (500+ feeds) complete efficiently. Synchronous processing provides immediate feedback on success and failure counts. Includes advanced tagging support and detailed error reporting for failed items.

- **OPML Export:** Export selected feeds to a standard OPML 2.0 file. Tags associated with feeds are preserved using the `category` attribute, ensuring portability across different feed readers.

- **Article Management:** Retrieve articles with flexible filtering. Items are consistently sorted by creation date in ascending order (oldest first) across all views to ensure a predictable reading sequence. Track article status including read/unread. Features an information-dense list view displaying key metadata (publication/creation dates, snippets). Includes date-based filtering (e.g., Past 24 hours, Past 7 days, Past 30 days, Past 90 days, or Past 365 days) and a visibility toggle to easily show or hide read items. Supports bulk operations, such as marking multiple articles as read simultaneously for improved efficiency.
  - **Floating Bulk Actions:** Selecting multiple items triggers a floating action bar at the bottom of the screen, providing a stable and ergonomically accessible UI for bulk operations without causing layout shifts.
  - **Transient Removal:** Features a "Clear Read Items" button to temporarily remove read articles from the current view. This memory-only operation helps users focus on unread content during a session without permanently modifying the backend database state.

- **Content Reading:** Clean, distraction-free modal interface for reading full article content. Supports rich HTML rendering, images, author attribution, and categories. Features a highly optimized, compact header to maximize the vertical display area for the article. The primary action, marking an item as read or unread, is accessible via an ergonomic Floating Action Button (FAB) at the bottom-right, keeping the main content clear of obstruction. Features robust, keyboard-centric navigation between items with automatic pagination and read-status management, intentionally omitting redundant on-screen navigation buttons to further focus on content. The navigation sequence is synchronized with the current list view, including items that have been marked as read during the session. Includes a virtual placeholder at the end of lists to provide a clear terminal point and streamline marking the final item as read. Implements standard modal interactions including Escape key and backdrop dismissal. Full URL synchronization (deep linking) for direct access and browser history support, ensuring that active filters (tags and date ranges) are preserved when returning to the list view.
  - **Intelligent Image Layout:** Automatically adjusts the layout of images within article content. Multiple consecutive images or icons within a single paragraph are displayed in a flexible, side-by-side grid to optimize vertical space and improve visual organization.
  - **Swipe Navigation:** Intuitive horizontal swipe gestures on touch devices allow users to navigate between articles seamlessly, with smooth visual feedback as the content follows the drag. Features a non-linear resistance bounce effect when swiping past the first or last items to provide tactile feedback, and includes ARIA-compliant instructions for screen reader users.
  - **Adaptive Metadata Display:** On narrow viewports (< 480px), "Published" and "Received" text labels in the article detail view are replaced by intuitive icons with tooltips to maintain a compact layout without sacrificing information.

- **Markdown Rendering:** Automatically converts article content and descriptions from HTML to Markdown during ingestion. Renders this Markdown back to safe HTML in the frontend, ensuring a consistent and secure reading experience while preserving links, images, and basic formatting.

- **Tagging System:** Create and manage custom tags to categorize feeds. Features a robust bulk tagging UI to efficiently organize multiple subscriptions at once. Filter both the feed list and article stream by selected tags for organized content discovery, with unread counts displayed per tag to prioritize reading.
  - **Responsive Tag Lists:** Tag filters are consolidated into a single row with horizontal scrolling and arrow indicators, maximizing vertical space while maintaining easy access to all categories.

- **Dynamic Favicon:** The browser tab's favicon dynamically updates its color based on the total unread count (Blue for 0-199, Orange for 200-999, Red for 1000+), providing a passive, at-a-glance status update even when the application is in the background.

- **Adaptive Background Fetching:** Periodically fetches and updates feeds in the background. The system automatically calculates the optimal fetch interval for each feed based on its actual update frequency (averaging the last 10 items), ranging from 15 minutes for high-frequency sources to 24 hours for rare updates. This ensures timely delivery while optimizing resource usage.

- **Deduplication & Storage:** Efficiently stores and retrieves articles with URL-based deduplication and normalized data structures, ensuring unique presentation even when items are associated with multiple feeds. Tracks per-feed metadata, including original publication and discovery timestamps for each association.

- **Standard Compliance:** Supports standard RSS and Atom feed formats.
- **Responsive Design:** Accessible on desktop and mobile devices with a tailored experience. Features adaptive headers that prioritize content on small screens, Floating Action Buttons (FAB) for ergonomic access to primary actions like tag management, and an optimized feed list that ensures layout integrity without horizontal scrolling via intelligent text truncation and consolidated action menus on narrow viewports.
- **Background Deferral:** To ensure high responsiveness, newly added feeds (via manual entry or OPML import) initially register metadata only. Article content is deferred to the background scheduler for the first crawl.
  - **Maximized Viewport:** Redundant page titles (e.g., "All Items") are omitted in favor of active navigation states, allowing more content to be visible immediately on both desktop and mobile.

### Success Metrics
- **User Engagement:** Regular usage of the application for daily reading.
- **Deployment Ease:** Simple setup process for self-hosting (e.g., Docker Compose).
- **Responsiveness:** Fast UI interactions and quick article loading.
