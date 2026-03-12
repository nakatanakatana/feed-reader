## Why

Currently, when a user changes the sort order or filter conditions on the Feeds management screen, these settings are lost as soon as the page is refreshed or the application is reopened. This forces users to manually re-apply their preferred settings every time, leading to a suboptimal and repetitive user experience.

## What Changes

- Implement persistence for sort order and filter settings on the Feeds management screen.
- Save settings to the browser's local storage whenever they are modified.
- Automatically restore the last used settings from local storage when the Feeds screen is loaded.

## Capabilities

### New Capabilities
- `feed-settings-persistence`: The system SHALL persist the user's last selected sort order and filter conditions for the feed management view across browser sessions.

### Modified Capabilities
(None - Item List persistence was deemed unnecessary due to existing URL parameter handling)

## Impact

- Frontend: Update the state management for feed filters and sort order to interact with local storage.
- Storage: Browser local storage will be used to store these small pieces of configuration.
