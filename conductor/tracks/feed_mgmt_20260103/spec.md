# Track Spec: Feed Management Frontend

## Overview
Implement a user interface in the SolidJS frontend to manage RSS/Atom feeds. This UI will interact with the existing Go backend `FeedService` via Connect RPC.

## User Stories
- As a user, I want to see a list of all my subscribed feeds.
- As a user, I want to add a new feed by providing its URL.
- As a user, I want to delete a feed I no longer wish to follow.

## Functional Requirements
- **Feed List View:** Display a list of feeds with their titles and URLs.
- **Add Feed Form:** A form to input a feed URL and submit it to the backend.
- **Delete Action:** A button or action to remove a feed from the list.
- **Integration:** Use `connect-query` or similar TanStack Query integration to talk to the `FeedService`.

## Technical Constraints
- **Frontend:** SolidJS, TanStack Router, TanStack Query.
- **Styling:** Panda CSS.
- **Backend Communication:** Connect RPC Web.
