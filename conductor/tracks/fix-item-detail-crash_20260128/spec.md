# Specification: Fix runtime crash in Item Detail View

## Overview
Address a recurring runtime error `Cannot read properties of undefined (reading 'itemId')` that occurs in the Item Detail view (`items/$itemId`). This error causes the entire application to crash (hitting the Error Boundary) and typically manifests when opening an item or navigating between items using the "Next" or "Previous" buttons.

## Functional Requirements
- **Root Cause Investigation:** Analyze `ItemDetailRouteView.tsx`, its hooks, and navigation helpers to identify where `itemId` is accessed on an undefined object.
- **Implement Defensive Guard Clauses:** Add necessary checks to ensure that the application handles cases where route parameters or item objects are temporarily `undefined` or `null` during transitions or data fetching.
- **Robust Navigation Helpers:** Harden navigation-related functions (like `getLinkProps`) to safely handle invalid or missing inputs without throwing exceptions.
- **Graceful Error Handling:** Ensure that invalid state (e.g., a non-existent item ID in the URL) results in a user-friendly message or redirect instead of a complete application crash.

## Non-Functional Requirements
- **Stability:** The application must be resilient to race conditions during data fetching and navigation.
- **Maintainability:** Use idiomatic TypeScript patterns for optional chaining and nullish coalescing to prevent similar errors in the future.

## Acceptance Criteria
- [ ] No `Cannot read properties of undefined` error when opening the item detail view.
- [ ] Seamless navigation between items via "Next" and "Previous" buttons without crashes.
- [ ] Application remains functional and displays an appropriate fallback if an invalid item ID is provided in the URL.

## Out of Scope
- Redesigning the Item Detail UI.
- Adding new features unrelated to this bug fix.
