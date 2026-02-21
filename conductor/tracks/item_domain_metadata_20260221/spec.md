# Specification: Item Domain Metadata Display

## Overview
This track adds the article's source domain to the `ItemDetailModal` metadata row. This provides users with a quick visual reference for the article's origin without needing to click through to the original URL.

## Functional Requirements
- **Domain Extraction**: Extract the full hostname (e.g., `www.example.com`) from the item's URL in the frontend.
- **Display**: Show the extracted hostname in the `ItemDetailModal`'s metadata row, alongside existing metadata like "Published" and "Received" dates.
- **Visual Style**:
  - Use a secondary style (smaller font, subtle color) to distinguish it from primary content.
  - Include an icon (e.g., a globe or external link icon) next to the domain name.
- **Interactivity**: The domain should be displayed as static text (not a link).
- **Responsive Design**: On narrow viewports (< 480px), ensure the domain display remains compact and doesn't cause layout issues.

## Non-Functional Requirements
- **Performance**: Domain extraction should be performed efficiently on the client-side.
- **Accessibility**: Provide appropriate ARIA labels for the domain metadata and icon.

## Acceptance Criteria
- [ ] The `ItemDetailModal` metadata row includes the full hostname of the article's URL.
- [ ] The hostname is styled as secondary text with an accompanying icon.
- [ ] The hostname is NOT a clickable link.
- [ ] The layout remains consistent and responsive on both desktop and mobile viewports.

## Out of Scope
- Filtering by domain.
- Backend-side domain extraction or storage.
- Favicon display next to the domain.
