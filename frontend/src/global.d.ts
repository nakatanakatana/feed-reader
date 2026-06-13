import type { QueryClient } from "@tanstack/solid-query";

declare global {
  interface Window {
    __queryClient?: QueryClient;
  }
}
