import { createEffect, onCleanup } from "solid-js";
import { getFaviconColor, generateFaviconUri } from "../lib/favicon";

interface DynamicFaviconProps {
  unreadCount: number;
}

export const DynamicFavicon = (props: DynamicFaviconProps) => {
  let originalFavicon: string | null = null;

  createEffect(() => {
    const link = document.querySelector('link[rel="icon"]') as HTMLLinkElement;
    if (link) {
      if (originalFavicon === null) {
        originalFavicon = link.getAttribute("href");
      }
      const color = getFaviconColor(props.unreadCount);
      link.href = generateFaviconUri(color);
    }
  });

  onCleanup(() => {
    const link = document.querySelector('link[rel="icon"]') as HTMLLinkElement;
    if (link && originalFavicon !== null) {
      link.href = originalFavicon;
    }
  });

  return null;
};
