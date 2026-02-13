# Specification: Swipe Navigation for ItemDetailModal

## Overview
Enable intuitive navigation between articles in the `ItemDetailModal` on touch devices using swipe gestures (left/right flick or drag).

## Functional Requirements
- **Gesture-Based Navigation:**
    - **Right Swipe (Left to Right):** Navigate to the previous article.
    - **Left Swipe (Right to Left):** Navigate to the next article.
- **Visual Feedback (Drag Following):**
    - The article content should follow the user's touch movement horizontally during the swipe gesture.
    - If the user releases their finger before reaching the threshold, the content should smoothly transition back to its original position.
- **Switching Threshold:**
    - The article switch is triggered if the user releases their finger after dragging at least 25%–30% of the screen (or modal) width.
- **Navigation Consistency:**
    - Maintain synchronization with existing keyboard navigation (J/K keys) and the item list view.
    - If at the beginning or end of the list, further swiping in that direction should either be restricted or provide visual feedback indicating no more items are available.

## Non-Functional Requirements
- **Smooth Animations:** Use CSS Transitions or the Web Animations API for fluid content movement and article switching.
- **Performance:** Use GPU-accelerated transforms (`transform: translateX()`) to ensure lag-free visual feedback during swiping.
- **Accessibility:** Ensure the swipe logic does not interfere with existing button-based or keyboard-based interactions.

## Acceptance Criteria
- [ ] On a touch device (or mobile emulator), a right swipe successfully navigates to the previous article.
- [ ] On a touch device (or mobile emulator), a left swipe successfully navigates to the next article.
- [ ] Article content follows the finger's horizontal movement during a swipe gesture.
- [ ] Releasing the finger before the 25% threshold returns the content to its original position.
- [ ] Releasing the finger after the 25% threshold triggers a smooth transition to the next/previous article.
- [ ] The interaction is limited to touch events to avoid accidental triggers on desktop mouse interactions.

## Out of Scope
- Vertical swipe interactions (standard vertical scrolling behavior must be preserved).
- Complex layering or previews of the "next/previous" article behind the current content during the drag.
