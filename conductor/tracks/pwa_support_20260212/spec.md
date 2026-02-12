# Specification: PWA Support with VitePWA

## Overview
Introduce `vite-plugin-pwa` to the project to enable Progressive Web App (PWA) capabilities. The primary goal is to make the application installable on mobile and desktop devices, providing a native-like experience.

## Functional Requirements
- **Installability**: Users should be able to install the application to their home screen or desktop.
- **Web App Manifest**: Provide a valid `manifest.json` with appropriate icons, theme colors, and display settings.
- **Service Worker**: Register a Service Worker using VitePWA's "Auto Update" strategy to handle caching and offline support for basic assets.
- **Display Mode**: Set the display mode to `standalone` to ensure a native-like UI without browser chrome.

## Non-Functional Requirements
- **Performance**: Service Worker should improve repeat-visit loading times by caching static assets.
- **Maintainability**: Use `vite-plugin-pwa` to automate Service Worker generation and manifest management.

## Acceptance Criteria
- [ ] `vite-plugin-pwa` is installed and configured in `vite.config.js`.
- [ ] A valid Web App Manifest is generated and linked in the HTML.
- [ ] Service Worker is registered and functional in the production build.
- [ ] The application passes the "Installable" audit in Chrome DevTools (Lighthouse/Application panel).
- [ ] New versions of the app are automatically applied via the Service Worker (Auto Update strategy).

## Out of Scope
- Push Notifications.
- App Shortcuts.
- Advanced offline data synchronization (TanStack Query/DB handle data, SW handles assets).
