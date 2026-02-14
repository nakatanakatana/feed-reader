# Track Specification: Optimize ItemDetailModal Header Height

## Overview
Currently, the header of the `ItemDetailModal` (containing the title and the "Mark as read" button) occupies significant vertical space. This track aims to increase the visible area for the main content by redesigning the header layout and relocating the primary action button.

## Functional Requirements
- **Header Refinement**:
    - Minimize the vertical height of the fixed header in `ItemDetailModal`.
    - Reduce vertical padding and optimize font sizes within the header to occupy the least amount of space necessary.
- **Relocate "Mark as Read" Button**:
    - Remove the "Mark as read" button from the fixed header.
    - Re-implement the "Mark as read" action as a Floating Action Button (FAB) positioned at the bottom right of the modal/screen.
- **Responsive Consistency**:
    - These changes must be applied across all device sizes (mobile, tablet, and desktop) to ensure a consistent user experience.

## Non-Functional Requirements
- **Visual Stability**: Ensure that the relocation of the button and the reduction of header height do not cause layout shifts during loading or transitions.
- **Accessibility**: The new FAB must be easily discoverable and reachable, following standard mobile and desktop accessibility patterns.

## Acceptance Criteria
- [ ] The fixed header in `ItemDetailModal` is significantly shorter than the original design.
- [ ] The "Mark as read" button is no longer present in the header.
- [ ] A functional FAB for "Mark as read" is visible and usable at the bottom right.
- [ ] The main content area of the modal displays more lines of text/content compared to the previous version on the same screen size.
- [ ] The layout looks polished and professional on both mobile and desktop viewports.

## Out of Scope
- Changing the content rendering logic (Markdown/HTML conversion).
- Modifying other navigation buttons or gestures (e.g., swipe navigation).
- Implementing a completely collapsing header that hides on scroll.
