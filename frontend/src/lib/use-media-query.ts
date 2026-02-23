import { createSignal, onCleanup, onMount } from "solid-js";

export function createMediaQuery(query: string) {
  const [matches, setMatches] = createSignal(
    typeof window !== "undefined" ? window.matchMedia(query).matches : false,
  );

  onMount(() => {
    const media = window.matchMedia(query);
    setMatches(media.matches);
    const listener = (e: MediaQueryListEvent) => setMatches(e.matches);
    media.addEventListener("change", listener);
    onCleanup(() => media.removeEventListener("change", listener));
  });

  return matches;
}
