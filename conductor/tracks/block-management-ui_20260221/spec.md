# Specification: Block Management UI Update and Bulk Configuration Tests

## Overview
This track aims to improve the user interface for managing blocking and parsing rules by aligning it with the existing "Feeds" page layout. Additionally, it focuses on strengthening the reliability of bulk configuration features through automated testing.

## Functional Requirements

### 1. UI Layout Refactoring
- **Target Pages:** 
  - `blocking.tsx` (Blocking Rules)
  - `parsing-rules.tsx` (Parsing Rules)
- **New Layout Structure:**
  - **Top Section:** Static input forms for adding new rules.
  - **Bottom Section:** A list of existing rules displayed as cards (replacing the current table format).
- **Consistency:** Mimic the layout and styling of `feeds.tsx`, including spacing and component usage (e.g., `PageLayout`, `ActionButton`).

### 2. Bulk Configuration Feature
- **Target:** Blocking Rules.
- **Functionality:** Allow users to input multiple rules at once using a newline-separated format (e.g., `rule_type,username,domain,keyword`).
- **Integration:** The bulk import form should be a prominent part of the top-section layout.

### 3. Automated Testing
- **Focus:** Bulk creation of blocking rules.
- **Test Scenarios:**
  - Success: Valid multiple rules are correctly parsed and saved to the database.
  - Failure: Invalid formats are handled gracefully without crashing or saving partial/corrupt data.
  - Edge Cases: Empty input, single rule, whitespace handling.

## Non-Functional Requirements
- **Responsive Design:** Ensure the new card-based layout and top forms work well on both desktop and mobile viewports.
- **Maintainability:** Reuse existing UI components and patterns from the project's design system (Panda CSS).

## Acceptance Criteria
- [ ] Both Blocking and Parsing Rules pages feature a top-mounted input form.
- [ ] Existing rules on these pages are displayed in a card-based list instead of a table.
- [ ] The "Bulk Import" functionality for blocking rules is tested with >80% code coverage.
- [ ] All automated tests pass.

## Out of Scope
- Modifying the underlying data models or backend logic (unless required for testing).
- Adding bulk management features to the Parsing Rules page (focus is on layout only).
