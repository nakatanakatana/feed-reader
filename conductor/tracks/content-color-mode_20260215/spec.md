# Track Specification: Content Color Mode Support in ItemDetailModal

## 1. Overview
This track introduces display control for GitHub-style color-mode-dependent content within the `ItemDetailModal` component.
Specifically, it applies CSS to toggle the visibility of elements with IDs `#gh-light-mode-only` and `#gh-dark-mode-only` based on the user's browser/OS color mode settings (`prefers-color-scheme`).

## 2. Goals
- Ensure light-mode-only and dark-mode-only content toggles correctly within `ItemDetailModal`.
- Synchronize visibility with the user's OS/browser settings (`prefers-color-scheme`).
- Scope the changes strictly to `ItemDetailModal` to prevent side effects in other views.

## 3. Functional Requirements
### 3.1 CSS Display Control
- **Light Mode (`@media (prefers-color-scheme: light)`):**
    - Elements with `#gh-light-mode-only` MUST be visible.
    - Elements with `#gh-dark-mode-only` MUST be hidden (`display: none !important`).
- **Dark Mode (`@media (prefers-color-scheme: dark)`):**
    - Elements with `#gh-dark-mode-only` MUST be visible.
    - Elements with `#gh-light-mode-only` MUST be hidden (`display: none !important`).

### 3.2 Scope Limitation
- These CSS rules MUST be scoped specifically to the article content container within the `ItemDetailModal` component (e.g., nested within the article body selector).

## 4. Implementation Details
- **File:** `frontend/src/components/ItemDetailModal.tsx`
- **Method:** Use Panda CSS (or the existing styling mechanism) to define styles within the component.
- **Detection:** Use the CSS media query `prefers-color-scheme`.

## 5. Acceptance Criteria
- [ ] In a light mode environment, elements with `#gh-light-mode-only` are visible, and `#gh-dark-mode-only` are hidden.
- [ ] In a dark mode environment, elements with `#gh-dark-mode-only` are visible, and `#gh-light-mode-only` are hidden.
- [ ] The style changes DO NOT affect views outside of `ItemDetailModal` (e.g., Feed List, Settings).

## 6. Out of Scope
- Integration with application-specific custom theme toggles (reliance is strictly on OS/browser settings).
- Support for these IDs outside of `ItemDetailModal`.
