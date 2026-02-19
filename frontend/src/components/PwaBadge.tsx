import { createEffect } from "solid-js";

export interface PwaBadgeProps {
  unreadCount: number;
}

/**
 * Component that updates the application icon badge using the Badging API.
 * It does not render anything.
 */
export function PwaBadge(props: PwaBadgeProps) {
  createEffect(() => {
    const count = props.unreadCount;
    const nav = navigator as any;

    if ("setAppBadge" in nav && typeof nav.setAppBadge === "function") {
      if (count > 0) {
        nav.setAppBadge(count).catch((err: unknown) => {
          // Log only if it's not a common "user denied" or "not installed" error
          // though usually these shouldn't be thrown as exceptions but rejected promises
          console.warn("Failed to set app badge:", err);
        });
      } else {
        if ("clearAppBadge" in nav && typeof nav.clearAppBadge === "function") {
          nav.clearAppBadge().catch((err: unknown) => {
            console.warn("Failed to clear app badge:", err);
          });
        }
      }
    }
  });

  return null;
}
