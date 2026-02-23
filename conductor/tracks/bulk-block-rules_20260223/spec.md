# Specification: Bulk Registration for Item Block Rules

## Overview
Add a user interface for bulk registration of item block rules on the "Block Rules" page. This feature allows users to import multiple rules at once using a CSV-like format, supporting both direct text entry and file uploads.

## Functional Requirements
- **Entry Point:** Add a "Bulk Add" button next to the existing "Add" button on the block-rules page (`/block-rules`).
- **Bulk Add Modal:**
    - **Input Methods:**
        - A text area for pasting CSV-formatted rules.
        - A file upload field for `.csv` files.
    - **Format:** Supports `rule_type, value, [domain]` columns.
        - `rule_type`: `user`, `domain`, `user_domain`, or `keyword`.
        - `value`: The actual string to block.
        - `domain`: Optional (required for `user_domain` and `domain`).
    - **Parsing & Preview:**
        - Parse the input data and display a preview table before submission.
        - Show validity status for each line (e.g., missing required fields, invalid rule type).
        - Allow users to see which lines will be imported and which will be skipped.
    - **Submission:**
        - Filter out invalid lines and send only valid rules to the backend.
        - Use the existing `AddItemBlockRules` RPC to register multiple rules in one request.
- **Error Handling:**
    - Skip invalid CSV lines and proceed with valid ones.
    - Display a summary of imported vs. skipped rules after completion.

## Non-Functional Requirements
- **UI/UX:**
    - Ensure the modal is responsive and works well on mobile devices.
    - Provide clear instructions on the expected CSV format within the modal.
- **Performance:**
    - Handle bulk registration efficiently (e.g., 100+ rules) without blocking the UI.

## Acceptance Criteria
- [ ] "Bulk Add" button is visible and opens a modal.
- [ ] Users can paste CSV text and see it parsed into a preview table.
- [ ] Users can upload a CSV file and see it parsed into a preview table.
- [ ] Invalid lines (e.g., empty value, invalid type) are correctly identified in the preview.
- [ ] Clicking "Register" in the modal sends only valid rules to the backend.
- [ ] The rule list on the main page is automatically refreshed after bulk registration.
- [ ] A success message indicates how many rules were registered.

## Out of Scope
- Editing or deleting existing rules in bulk (this is for addition only).
- Exporting rules to CSV.
