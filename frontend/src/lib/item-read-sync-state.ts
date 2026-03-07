import { createSignal } from "solid-js";

// Shared sync anchor for item read states
export const [lastReadFetched, setLastReadFetched] = createSignal<Date | null>(
  null,
);
