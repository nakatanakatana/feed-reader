# Product Guidelines

This document outlines the design principles, visual identity, and user experience goals for the Feed Reader application.

## 1. Visual Aesthetic: Modern & Information-Dense
The application should provide a high-utility interface that prioritizes information density without sacrificing clarity.
-   **Grid-Based Layouts:** Use a robust grid system to organize content efficiently.
-   **Rich Metadata:** Display key information (source, date, tags) prominently but in a way that doesn't clutter the view.
-   **Visual Hierarchy:** Use clear typography and subtle color variations to guide the user's eye to the most important elements.
-   **Consistent Components:** Use a standard set of UI components (buttons, inputs, cards) to create a cohesive feel.

## 2. Brand Tone: Professional & Reliable
As a self-hosted tool focused on data and content, the tone should inspire confidence and stability.
-   **Clear & Direct:** Use precise language for labels, instructions, and error messages.
-   **Technical Precision:** Don't shy away from technical details when they are relevant to the user's control over the service.
-   **Trustworthy:** Avoid marketing jargon; focus on functionality and data integrity.

## 3. User Experience (UX) Principles

### Keyboard-Centric Navigation
-   Implement comprehensive keyboard shortcuts for all primary actions (navigating articles, marking as read, switching views).
-   Focus management should be predictable and visible.

### Zero-Latency Feel
-   Use optimistic UI updates to provide immediate feedback for user actions.
-   Implement efficient data fetching and caching strategies to minimize perceived loading times.
-   Transitions should be smooth but fast.

### Mobile-First Intuition
-   Ensure all interactive elements are touch-friendly with appropriate hit targets (minimum 44x44px).
- Use intuitive gestures (swiping to mark read/unread or to navigate between items) that feel natural in a mobile browser.
-   Responsive layouts must adapt gracefully from desktop density to mobile focus. On narrow screens, prioritize high-value information (like unread counts) and move complex header actions into accessible Floating Action Buttons (FAB).
-   Minimize UI chrome on mobile to maximize content space, such as hiding non-essential titles or static headers when space is at a premium.
-   Use horizontal scrolling for list-based filters (like tags) to keep them in a single row, preserving vertical space for the primary content stream.
-   Prefer floating, overlay-style UI for transient actions (like bulk selection) to maintain layout stability and prevent content jumping.

## 4. Content Presentation: Magazine/Card View
Articles should be presented in a visual grid to allow for engaging browsing.
-   **Visual Engagement:** Prioritize feed images and article thumbnails where available.
-   **Balanced Snippets:** Provide enough text in the card view to give context without overwhelming the grid.
-   **Flexible Grids:** The number of columns should adjust based on screen width to maintain optimal card sizes.
