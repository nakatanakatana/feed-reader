import { createSignal, onSettled } from "solid-js";

export function createMediaQuery(query: string) {
  const [matches, setMatches] = createSignal(
    typeof window !== "undefined" && typeof window.matchMedia === "function"
      ? (window.matchMedia(query)?.matches ?? false)
      : false,
  );

  onSettled(() => {
    if (
      typeof window === "undefined" ||
      typeof window.matchMedia !== "function"
    ) {
      return;
    }
    const media = window.matchMedia(query);
    if (!media) return;
    setMatches(media.matches ?? false);
    const listener = (e: MediaQueryListEvent) => setMatches(e.matches);
    media.addEventListener?.("change", listener);
    return () => media.removeEventListener?.("change", listener);
  });

  return matches;
}
