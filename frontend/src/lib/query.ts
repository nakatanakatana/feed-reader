import { createConnectTransport } from "@connectrpc/connect-web";
import { QueryClient } from "@tanstack/solid-query";

export const transport = createConnectTransport({
  baseUrl: "/api",
  useHttpGet: true,
});

export const queryClient = new QueryClient();
if (typeof window !== "undefined") {
  (window as unknown as { __queryClient: QueryClient }).__queryClient =
    queryClient;
}
