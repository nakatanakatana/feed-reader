import { createEffect, onCleanup } from "solid-js";
import { generateFaviconUri, getFaviconColor } from "../lib/favicon";

interface DynamicFaviconProps {
  unreadCount: number;
}

export const DynamicFavicon = (props: DynamicFaviconProps) => {
  let originalFavicon: string | null = null;

  createEffect(() => {
    const link = document.querySelector('link[rel="icon"]');
    if (link instanceof HTMLLinkElement) {
      if (originalFavicon === null) {
        originalFavicon = link.getAttribute("href");
      }
      const color = getFaviconColor(props.unreadCount);
      link.href = generateFaviconUri(color);
    }
  });

  onCleanup(() => {
    const link = document.querySelector('link[rel="icon"]');
    if (link instanceof HTMLLinkElement && originalFavicon !== null) {
      link.href = originalFavicon;
    }
  });

  return null;
};
