import { createEffect, onCleanup } from "solid-js";

export interface PwaBadgeProps {
  unreadCount: number;
}

/**
 * Component that updates the application icon badge using the Badging API.
 * It does not render anything.
 */
export function PwaBadge(props: PwaBadgeProps) {
  createEffect(
    () => Math.min(props.unreadCount, 999),
    (count) => {
      if (
        "setAppBadge" in navigator &&
        typeof navigator.setAppBadge === "function"
      ) {
        if (count > 0) {
          navigator.setAppBadge(count).catch((err: unknown) => {
            // Log only if it's not a common "user denied" or "not installed" error
            // though usually these shouldn't be thrown as exceptions but rejected promises
            console.warn("Failed to set app badge:", err);
          });
        } else {
          if (
            "clearAppBadge" in navigator &&
            typeof navigator.clearAppBadge === "function"
          ) {
            navigator.clearAppBadge().catch((err: unknown) => {
              console.warn("Failed to clear app badge:", err);
            });
          }
        }
      }
    },
  );

  onCleanup(() => {
    if (
      "clearAppBadge" in navigator &&
      typeof navigator.clearAppBadge === "function"
    ) {
      navigator.clearAppBadge().catch((err: unknown) => {
        console.warn("Failed to clear app badge on cleanup:", err);
      });
    }
  });

  return null;
}
