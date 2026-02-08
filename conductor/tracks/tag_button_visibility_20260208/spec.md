# Specification: Improve Visibility of Selection Buttons

## Overview
Address the usability issue where selected and unselected states of buttons (especially in the Bulk Tagging UI) are difficult to distinguish. This will be achieved by standardizing a "Selected = Solid / Unselected = Outline" design pattern across the application to improve visual clarity.

## Functional Requirements
1. **Unified Selection UI**:
   - Selected buttons must use a solid background style (Solid).
   - Unselected buttons must use a transparent background with a border (Outline).
2. **Clarified Actions**:
   - Use the primary color (Blue) for positive selection actions like "Add".
   - Use the danger color (Red) for negative selection actions like "Remove".
3. **Component Consistency**:
   - Apply the same logic not only to `ActionButton` but also to other selectable elements like `TagChip`.

## Acceptance Criteria
- **Manage Tags Modal**:
  - "Add" button: Blue solid background when selected, gray outline when unselected.
  - "Remove" button: Red solid background when selected, gray outline when unselected.
- **TagChip Component**:
  - Blue solid background when selected, gray outline when unselected.
- **General**:
  - `ActionButton` variants (Primary, Secondary, Danger) should have sufficient contrast to represent selection states effectively.

## Out of Scope
- Changing the application's overall theme colors.
- Introducing new icons unless absolutely necessary for clarity.
