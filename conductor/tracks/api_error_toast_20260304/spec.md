# Specification - Global API Error Notification

## Overview
Add a feature to notify users with an auto-dismissing Toast notification when any API request (Mutation or Query) fails. This ensures users are aware of network errors or server-side issues without interrupting their workflow with a modal or native `alert()`.

## Functional Requirements
- **Toast Component:** Implement a `Toast` component for displaying non-intrusive error notifications.
- **Global Interception:** Intercept all API failures (both mutation and query) globally via the Connect RPC transport or TanStack Query's default options.
- **Generic Messaging:** Display a user-friendly generic error message (e.g., "An error occurred. Please try again.") in the Toast.
- **Auto-dismiss:** The Toast should automatically disappear after a specified timeout (e.g., 5 seconds).
- **Graceful Handling:** Multiple failures should be handled gracefully (e.g., updating the existing Toast or displaying a stack of Toasts).

## Non-Functional Requirements
- **Accessibility:** Use appropriate ARIA roles (e.g., `role="alert"`) for screen reader support.
- **Responsiveness:** Ensure the Toast is visible and properly positioned (e.g., bottom-right or top-center) on both desktop and mobile.
- **Styling:** Consistent with the existing design system using Panda CSS.

## Acceptance Criteria
- [ ] A Toast notification appears when an API request fails.
- [ ] The notification message is user-friendly and generic.
- [ ] The notification disappears automatically after 5 seconds.
- [ ] The Toast is styled consistently with the application UI.
- [ ] Automated tests (Vitest) verify the Toast appearance and auto-dismiss behavior.

## Out of Scope
- Success or informational notifications.
- Displaying detailed backend error messages or stack traces.
- Manual dismissal functionality (for now, auto-dismiss only).
